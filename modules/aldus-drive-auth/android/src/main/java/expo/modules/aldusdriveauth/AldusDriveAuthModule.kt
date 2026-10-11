package expo.modules.aldusdriveauth

import android.app.Activity
import android.content.Intent
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Separate authorization, NOT Google sign-in or Supabase identity. Never log credentials. */
class AldusDriveAuthModule : Module() {
  private var pending: Promise? = null
  private var sequence = 5100
  private var requestCode = 0
  override fun definition() = ModuleDefinition {
    Name("AldusDriveAuth")
    AsyncFunction("authorize") { promise: Promise ->
      if (pending != null) { promise.reject("DRIVE_BUSY", "Authorization already pending", null); return@AsyncFunction }
      val activity = appContext.throwingActivity
      pending = promise
      requestCode = ++sequence
      val code = requestCode
      val request = AuthorizationRequest.builder()
        .setRequestedScopes(listOf(Scope("https://www.googleapis.com/auth/drive.readonly"))).build()
      Identity.getAuthorizationClient(activity).authorize(request)
        .addOnSuccessListener { result ->
          if (requestCode != code || pending == null) return@addOnSuccessListener
          if (result.hasResolution()) {
            try {
              activity.startIntentSenderForResult(result.pendingIntent!!.intentSender, code, Intent(), 0, 0, 0)
            } catch (_: Exception) { fail() }
          } else complete(result)
        }.addOnFailureListener { if (requestCode == code) fail() }
    }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
    OnActivityResult { _, (code, resultCode, intent) ->
      if (code != requestCode || pending == null) return@OnActivityResult
      if (resultCode != Activity.RESULT_OK || intent == null) { fail(); return@OnActivityResult }
      try { complete(Identity.getAuthorizationClient(appContext.throwingActivity).getAuthorizationResultFromIntent(intent)) }
      catch (_: Exception) { fail() }
    }
    AsyncFunction("cancelAuthorization") { fail() }.runOnQueue(expo.modules.kotlin.functions.Queues.MAIN)
    AsyncFunction("clearToken") { token: String, promise: Promise ->
      Identity.getAuthorizationClient(appContext.reactContext!!)
        .clearToken(ClearTokenRequest.builder().setToken(token).build())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("DRIVE_CLEAR", "Unable to clear token", null) }
    }
    OnDestroy { fail() }
  }
  private fun complete(result: AuthorizationResult) {
    val promise = pending ?: return
    pending = null
    if (result.accessToken.isNullOrEmpty() || !result.grantedScopes.contains("https://www.googleapis.com/auth/drive.readonly")) {
      promise.reject("DRIVE_SCOPE", "Drive scope not granted", null); return
    }
    // API has no expires_in. Conservative local lifetime; server 401 always invalidates it.
    promise.resolve(mapOf("accessToken" to result.accessToken, "expiresAt" to System.currentTimeMillis() + 45 * 60 * 1000))
  }
  private fun fail() {
    val promise = pending
    pending = null
    requestCode = 0
    promise?.reject("DRIVE_AUTH", "Drive authorization interrupted or refused", null)
  }
}
