/* 
    middleware/auth.js

    هذا حارس البوابة 🛂
    وظيفته:

    يتأكد إن الشخص مسجّل دخول

    يفحص الـ JWT

    يقول للسيرفر:

    “إيه، هذا المستخدم فلان، رقمه كذا، ودوره كذا”

    بدونه؟
    أي شخص يقدر يضيف عقار أو يحذف أو يعبث. Chaos
*/

const jwt = require("jsonwebtoken");
const pool = require("../db"); // انتبه للمسار الصحيح

async function auth(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Accès refusé" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [decoded.id]
    );

    if (!userResult.rows.length) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    const user = userResult.rows[0];

    // 🚫 منع المحظور
    if (user.banned) {
      return res.status(403).json({ message: "Compte bloqué" });
    }

    // ⏳ منع المالك غير الموافق عليه
    if (user.role === "owner" && !user.approved) {
      return res.status(403).json({
        message: "Compte en attente de validation"
      });
    }

    req.user = user; // الآن نحفظ كل بياناته
    next();

  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
}

module.exports = auth;