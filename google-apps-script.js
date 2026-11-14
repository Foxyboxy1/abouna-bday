/**
 * ========================================================
 * كود Google Apps Script لحفظ رسائل عيد ميلاد أبونا دميان
 * ========================================================
 * 
 * خطوات التفعيل:
 * 1. افتح شيت جديد في Google Sheets (https://sheets.new)
 * 2. سمّ الشيت: "رسائل عيد ميلاد أبونا دميان"
 * 3. في الصف الأول اكتب العناوين:
 *    الخلية A1: التاريخ والوقت
 *    الخلية B1: اسم المهنئ
 *    الخلية C1: نص الرسالة
 * 4. من القائمة العلوية اضغط على:
 *    Extensions (امتدادات) -> Apps Script
 * 5. امسح أي كود موجود هناك، والصق هذا الملف بالكامل.
 * 6. اضغط على زر Deploy (نشر) بالأزرق في أعلى اليمين:
 *    -> New deployment (نشر جديد)
 *    -> اختر نوع النشر: Web app (تطبيق ويب)
 *    -> في خانة Description اكتب: "Abouna Birthday Messages"
 *    -> في خانة Execute as: اختر "Me" (حسابي)
 *    -> في خانة Who has access: اختر "Anyone" (أي شخص) [مهم جداً!]
 * 7. اضغط Deploy وامنح الصلاحيات (Authorize access).
 * 8. انسخ الرابط (Web app URL) وضعه في ملف config.js في خانة GOOGLE_SCRIPT_URL.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // انتظر حتى ثانيتين لحل أي تعارض في الكتابة في نفس الوقت
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // التأكد من وجود العناوين في الصف الأول إذا كان الشيت فارغاً
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["التاريخ والوقت", "الاسم", "الرسالة"]);
    }

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var name = (data.name && data.name.trim()) ? data.name.trim() : "محب لأبونا";
    var message = (data.message && data.message.trim()) ? data.message.trim() : "";

    if (!message) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "الرسالة فارغة"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // تنسيق التاريخ والوقت بتوقيت القاهرة
    var timestamp = Utilities.formatDate(new Date(), "Africa/Cairo", "yyyy-MM-dd hh:mm a");

    // إضافة الصف للشيت
    sheet.appendRow([timestamp, name, message]);

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "تم حفظ الرسالة بنجاح",
      entry: {
        date: timestamp,
        name: name,
        message: message
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // جلب كل الصفوف بعد صف العناوين
    var rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    var messages = [];

    // الترتيب من الأحدث إلى الأقدم
    for (var i = rows.length - 1; i >= 0; i--) {
      var row = rows[i];
      if (row[2] && row[2].toString().trim() !== "") {
        messages.push({
          date: row[0] ? row[0].toString() : "",
          name: row[1] ? row[1].toString() : "محب لأبونا",
          message: row[2].toString()
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      data: messages
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
