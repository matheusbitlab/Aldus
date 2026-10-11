package expo.modules.alduspdfocr

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.max
import kotlin.math.roundToInt

class AldusPdfOcrModule : Module() {
  private val cancelledOperations = ConcurrentHashMap.newKeySet<Int>()

  override fun definition() = ModuleDefinition {
    Name("AldusPdfOcr")

    AsyncFunction("beginOperation") { operationId: Int ->
      cancelledOperations.remove(operationId)
    }

    AsyncFunction("cancelOperation") { operationId: Int ->
      cancelledOperations.add(operationId)
    }

    AsyncFunction("recognizePage") Coroutine { uri: String, pageIndex: Int, maxDimension: Int, operationId: Int ->
      checkActive(operationId)
      recognizePage(uri, pageIndex, maxDimension.coerceIn(1200, 2400), operationId)
    }
  }

  private suspend fun recognizePage(
    uriString: String,
    pageIndex: Int,
    maxDimension: Int,
    operationId: Int
  ): Map<String, Any> {
    val descriptor = openDescriptor(uriString)
    val renderer = PdfRenderer(descriptor)
    var bitmap: Bitmap? = null
    var page: PdfRenderer.Page? = null
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      if (pageIndex !in 0 until renderer.pageCount) throw IllegalArgumentException("Página de OCR inválida.")
      checkActive(operationId)
      page = renderer.openPage(pageIndex)
      val scale = maxDimension.toDouble() / max(page.width, page.height).toDouble()
      val bitmapWidth = max(1, (page.width * scale).roundToInt())
      val bitmapHeight = max(1, (page.height * scale).roundToInt())
      bitmap = Bitmap.createBitmap(bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888)
      bitmap.eraseColor(Color.WHITE)
      page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
      checkActive(operationId)
      val recognized = recognizer.process(InputImage.fromBitmap(bitmap, 0)).awaitResult()
      checkActive(operationId)
      return mapOf(
        "pageIndex" to pageIndex,
        "bitmapWidth" to bitmapWidth,
        "bitmapHeight" to bitmapHeight,
        "lines" to recognized.textBlocks.flatMap { block -> block.lines.mapNotNull(::serializeLine) }
      )
    } finally {
      recognizer.close()
      bitmap?.recycle()
      page?.close()
      renderer.close()
      descriptor.close()
    }
  }

  private fun serializeLine(line: Text.Line): Map<String, Any>? {
    val bounds = line.boundingBox ?: return null
    val value = line.text.trim()
    if (value.isEmpty()) return null
    return mapOf(
      "text" to value,
      "left" to bounds.left,
      "top" to bounds.top,
      "right" to bounds.right,
      "bottom" to bounds.bottom
    )
  }

  private fun openDescriptor(uriString: String): ParcelFileDescriptor {
    val context = appContext.reactContext ?: throw Exceptions.AppContextLost()
    val uri = Uri.parse(uriString)
    return when {
      uri.scheme == "content" -> context.contentResolver.openFileDescriptor(uri, "r")
      uri.scheme == "file" -> ParcelFileDescriptor.open(File(requireNotNull(uri.path)), ParcelFileDescriptor.MODE_READ_ONLY)
      uri.scheme.isNullOrEmpty() -> ParcelFileDescriptor.open(File(uriString), ParcelFileDescriptor.MODE_READ_ONLY)
      else -> null
    } ?: throw IllegalArgumentException("O OCR requer um PDF local neste dispositivo.")
  }

  private fun checkActive(operationId: Int) {
    if (cancelledOperations.contains(operationId)) throw IllegalStateException("OCR cancelado.")
  }

  private suspend fun <T> Task<T>.awaitResult(): T = suspendCancellableCoroutine { continuation ->
    addOnSuccessListener { value -> if (continuation.isActive) continuation.resume(value) }
    addOnFailureListener { error -> if (continuation.isActive) continuation.resumeWithException(error) }
    addOnCanceledListener { if (continuation.isActive) continuation.cancel() }
  }
}
