package expo.modules.aldusdriveauth

import android.app.Activity
import android.content.Intent
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Separate authorization, NOT Google sign-in or Supabase identity. Never log credentials. */
class AldusDriveAuthModule : Module() {
  private var pending: Promise? = null
  private var sequence = 5100
  private var requestCode = 0
  private var operationId: String? = null
  override fun definition() = ModuleDefinition {
    Name("AldusDriveAuth")
    Events("onAuthorizationState")
    AsyncFunction("authorize") { id: String, promise: Promise ->
      if (pending != null) { promise.reject("DRIVE_BUSY", "Authorization already pending", null); return@AsyncFunction }
      val activity = appContext.currentActivity
      if (activity == null) { promise.reject("DRIVE_CONFIGURATION", "Android activity unavailable", null); return@AsyncFunction }
      pending = promise
      operationId = id
      requestCode = ++sequence
      val code = requestCode
      val request = AuthorizationRequest.builder()
        .setRequestedScopes(listOf(Scope("https://www.googleapis.com/auth/drive.readonly"))).build()
      try { Identity.getAuthorizationClient(activity).authorize(request)
        .addOnSuccessListener { result ->
          if (requestCode != code || pending == null) return@addOnSuccessListener
          if (result.hasResolution()) {
            try {
              emitState("resolution")
              activity.startIntentSenderForResult(result.pendingIntent!!.intentSender, code, Intent(), 0, 0, 0)
            } catch (_: Exception) { fail("DRIVE_UNKNOWN") }
          } else complete(result)
        }.addOnFailureListener { error -> if (requestCode == code) fail(errorCode(error)) }
      } catch (error: Exception) { fail(errorCode(error)) }
    }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
    OnActivityResult { _, (code, resultCode, intent) ->
      if (code != requestCode || pending == null) return@OnActivityResult
      emitState("callback")
      if (intent == null) { fail(if (resultCode == Activity.RESULT_CANCELED) "DRIVE_AUTH_CANCELLED" else "DRIVE_UNKNOWN"); return@OnActivityResult }
      try { complete(Identity.getAuthorizationClient(appContext.reactContext!!).getAuthorizationResultFromIntent(intent), true) }
      catch (error: Exception) { fail(if (resultCode == Activity.RESULT_CANCELED && error !is ApiException) "DRIVE_AUTH_CANCELLED" else errorCode(error)) }
    }
    // Cancellation from an old JS operation must never interrupt a newer consent.
    AsyncFunction("cancelAuthorization") { id: String -> if (id == operationId) fail("DRIVE_AUTH_CANCELLED") }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
    AsyncFunction("clearToken") { token: String, promise: Promise ->
      Identity.getAuthorizationClient(appContext.reactContext!!)
        .clearToken(ClearTokenRequest.builder().setToken(token).build())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("DRIVE_CLEAR", "Unable to clear token", null) }
    }
    OnDestroy { fail("DRIVE_AUTH_CANCELLED") }
  }
  private fun complete(result: AuthorizationResult, callbackReceived: Boolean = false) {
    val promise = pending ?: return
    pending = null
    operationId = null
    requestCode = 0
    if (result.accessToken.isNullOrEmpty() || !result.grantedScopes.contains("https://www.googleapis.com/auth/drive.readonly")) {
      promise.reject("DRIVE_SCOPE", "Drive scope not granted", null); return
    }
    // API has no expires_in. Conservative local lifetime; server 401 always invalidates it.
    promise.resolve(mapOf("accessToken" to result.accessToken, "expiresAt" to System.currentTimeMillis() + 45 * 60 * 1000, "callbackReceived" to callbackReceived))
  }
  private fun fail(code: String) {
    val promise = pending
    pending = null
    requestCode = 0
    operationId = null
    promise?.reject(code, "Drive authorization did not complete", null)
  }
  private fun errorCode(error: Exception): String = when ((error as? ApiException)?.statusCode) {
    CommonStatusCodes.CANCELED, 12501 -> "DRIVE_AUTH_CANCELLED"
    CommonStatusCodes.SIGN_IN_REQUIRED -> "DRIVE_AUTH_REQUIRED"
    CommonStatusCodes.NETWORK_ERROR, CommonStatusCodes.TIMEOUT -> "DRIVE_NETWORK"
    CommonStatusCodes.DEVELOPER_ERROR, CommonStatusCodes.API_NOT_CONNECTED -> "DRIVE_CONFIGURATION"
    else -> "DRIVE_UNKNOWN"
  }
  private fun emitState(stage: String) {
    try { sendEvent("onAuthorizationState", mapOf("operationId" to operationId, "stage" to stage)) }
    catch (_: Exception) { /* Diagnostics must never interrupt authorization. */ }
  }
}
