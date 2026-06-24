const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const app = express();
const hotelRoutes = require("./routes/hotelRoutes");
require("dotenv").config();

console.log("EMAIL:", process.env.EMAIL);
console.log("PASS EXISTS:", !!process.env.EMAIL_APP_PASSWORD);

const adminHotelRoutes =
require("./routes/adminHotelRoutes");

app.use("/admin", adminHotelRoutes);

const cors = require("cors");
const helmet = require("helmet");

const allowedOrigins = [
  "http://127.0.0.1:5501",
  "http://127.0.0.1:5502",
  "https://sos-logement.netlify.app",
  "https://soslogement.sn",
  "https://www.soslogement.sn"
].filter(Boolean);

app.use(helmet());


app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

console.log("CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);
const cookieParser = require("cookie-parser");

app.use(cookieParser());




const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

const { body, validationResult } = require("express-validator");




const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const streamifier = require("streamifier");

const bcrypt = require('bcrypt');
const pool = require('./db');

const auth = require("./middleware/auth");
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Accès réservé à l'admin" });
  }
  next();
};

const multer = require("multer");


// مجلد تخزين الصور
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images/videos allowed"), false);
    }
  }
});



const jwt = require("jsonwebtoken");

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.set('trust proxy', 1);


app.use(limiter);

app.get("/verify-token", auth, (req, res) => {
  res.json({
    success: true,
    role: req.user.role
  });
});


const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

    name: "sos-logement.onrender.com",
  

  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

/*transporter.verify(function(error){

if(error){

console.log("SMTP VERIFY ERROR:", error);

}else{

console.log("SMTP READY ✅");

}

});*/




app.use((req, res, next) => {
  const safeBody = { ...req.body };

  if (safeBody.password) {
    safeBody.password = "******";
  }

  console.log("Body:", safeBody);

  next(); // مهم جداً
});
console.log("DIR NAME:", __dirname);


let visitors = 0;


// Middleware لطباعة كل request body
app.use((req, res, next) => {
  console.log("===== NEW REQUEST =====");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  const safeBody = { ...req.body };

    if (safeBody.password) {
      safeBody.password = "******"; // إخفاء الباسورد
    }

  console.log("Body:", safeBody);
  console.log("=======================");
  next(); // مهم! عشان يستمر الباقي من الـ routes
});

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("DEV MODE:", req.method, req.url);
    next();
  });
}


async function generateGlobalPropertyCode(userId){

    // نأتي بمرجع المالك
    const userRes = await pool.query(
        `SELECT owner_ref FROM users WHERE id = $1`,
        [userId]
    );

    const ownerRef = userRes.rows[0].owner_ref;

    // نحسب عدد جميع العروض
    const propertiesCount = await pool.query(
        `SELECT COUNT(*) FROM properties WHERE user_id = $1`,
        [userId]
    );

    const hotelsCount = await pool.query(
        `SELECT COUNT(*) FROM hotels WHERE user_id = $1`,
        [userId]
    );

    // مستقبلا:
    // cars
    // lands
    // etc

    const total =
        parseInt(propertiesCount.rows[0].count)
        +
        parseInt(hotelsCount.rows[0].count);

    const sequence =
        String(total + 1).padStart(3, "0");

    return `${ownerRef}-${sequence}`;
}

app.use("/hotels", hotelRoutes);

app.post("/contact", async (req, res) => {
  console.log("CONTACT DATA:", req.body);

  try {
    const { full_name, email, phone, subject, message, is_owner } = req.body;

    

    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject: `📩 Contactez-nous - Nouveau message de ${full_name}`,
      text: `
      Nom: ${full_name}
      Email: ${email}
      Téléphone: ${phone}

      Sujet:
      ${subject}

      Message:
      ${message}

      Bailleur: ${is_owner}
      `
    });

    res.json({ success: true });

  } catch (err) {
    console.error("MAIL ERROR:", err);
    res.status(500).json({ message: "Email failed", error: err.message });
  }
});

app.get("/properties", async (req, res) => {
  try {

    const result = await pool.query(`
    SELECT
      p.property_code,
      p.title,
      p.type,
      p.description,
      p.city,
      p.price,
      p.chambres,
      p.cuisine,
      p.sdb,
      p.salon,
      p.is_student,
      p.max_students,

      ARRAY(
        SELECT image_url
        FROM property_images
        WHERE property_id = p.id
        LIMIT 1
      ) AS cover_image

    FROM properties p
    WHERE p.status = 'approved'
    ORDER BY p.id DESC
  `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/property/:code", async (req, res) => {
  try {
    console.log("CODE RECEIVED:", req.params.code);
    const result = await pool.query(`
      SELECT p.*, 
      ARRAY(
        SELECT json_build_object(
          'url', image_url,
          'type', type
        )
        FROM property_images
        WHERE property_id = p.id
      ) AS images
      FROM properties p
      WHERE p.property_code = $1
    `, [req.params.code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* =========================
   ADD PROPERTY
========================= */
app.post("/register",
    body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

  try {

    const { name, email, password } = req.body;

    // لا نثق بالـ role القادم من الفرونت
    let role = "seeker";

    if (req.body.role === "owner") {
      role = "owner";
    }

    if (req.body.role === "student") {
      role = "student";
    }

    if (req.body.role === "seeker") {
      role = "seeker";
    }

    // التأكد أن الإيميل غير مكرر
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, email, password, role, approved)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, hashedPassword, role, role === "owner" ? false : true]
    );

    res.json({ message: "Compte créé avec succès" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.post("/properties", auth, async (req, res) => {
  try {

    const userFromDB = await pool.query(
      "SELECT role, approved FROM users WHERE id = $1",
      [req.user.id]
    );

    if(userFromDB.rows.length === 0){
      return res.status(404).json({
        message: "Utilisateur introuvable"
      });
    }

    const user = userFromDB.rows[0];

    if (user.role !== "owner" || user.approved !== true) {
      return res.status(403).json({
        message: "Seuls les propriétaires approuvés peuvent publier des biens."
      });
    }

    if (user.approved !== true) {
      return res.status(403).json({
        message: "Votre compte propriétaire est en attente de validation."
      });
    }

    const ownerId = req.user.id;
    const { title, type, description, city, exact_location, price, chambres, cuisine, sdb, salon, is_student, max_students, surface_m2 } = req.body;

    const owner = await pool.query(
      "SELECT owner_ref FROM users WHERE id = $1",
      [ownerId]
    );

    if (!owner.rows[0]) {
      return res.status(404).json({ message: "Propriétaire non trouvé" });
    }

    const prefix = owner.rows[0].owner_ref;

    const lastCodeRes = await pool.query(
      `SELECT property_code 
      FROM properties 
      WHERE owner_id = $1 
      ORDER BY id DESC 
      LIMIT 1`,
      [ownerId]
    );

    let nextNumber = 1;

    if (lastCodeRes.rows[0]) {
      const lastCode = lastCodeRes.rows[0].property_code;

      // استخراج الرقم الأخير (بعد -)
      const parts = lastCode.split("-");
      nextNumber = parseInt(parts[1], 10) + 1;
    }

    const propertyCode = `${prefix}-${String(nextNumber).padStart(4, "0")}`;

    // تنظيف السعر من فراغات أو فاصلة
    let cleanedPrice = Number(price.toString().replace(/\s/g,'').replace(/,/g,''));
    if(isNaN(cleanedPrice)){
      return res.status(400).json({ message: "Prix invalide" });
    }
    const result = await pool.query(
      `INSERT INTO properties 
       (owner_id, property_code, title, type, description, city, exact_location, price, chambres, cuisine, sdb, salon, is_student, max_students, surface_m2, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, 'pending')
       RETURNING *`,
      [ownerId, propertyCode, title, type, description, city, exact_location, cleanedPrice, chambres, cuisine, sdb, salon, is_student, max_students, surface_m2]
    );
    res.json({ message: "Bien ajouté", property: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* =========================
   ADD IMAGES
========================= */

const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "sos-logement",

        resource_type: "auto",

        // ضغط ذكي
        quality: "auto:good",

        // WebP / AVIF تلقائي
        fetch_format: "auto",

        // تصغير الصور الكبيرة
        transformation: [
          {
            width: 1200,
            height: 800,
            crop: "limit",
            quality: "auto:good",
            fetch_format: "auto",
            flags: "progressive"
          }
        ]
      },

      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);

  });
};

app.post("/properties/:id/images", auth, async (req, res) => {
  try {

    const propertyId = req.params.id;

    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({
        message: "No images received"
      });
    }

    for (const img of images) {

      await pool.query(
        `INSERT INTO property_images
        (property_id, image_url, public_id, type)
        VALUES ($1,$2,$3,$4)`,
        [
          propertyId,
          img.url,
          img.public_id,
          img.resource_type
        ]
      );

    }

    res.json({
      message: "Images saved successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Erreur serveur"
    });
  }
});
/* =========================
   COVER IMAGE
========================= */

app.put("/properties/:id/cover", auth, async (req, res) => {
  const { image_url } = req.body;

  try {

    const property = await pool.query(
      "SELECT owner_id FROM properties WHERE id = $1",
      [req.params.id]
    );

    if (property.rows.length === 0) {
      return res.status(404).json({ message: "Le bien immobilier n'existe pas" });
    }

    if (property.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    await pool.query(
      "UPDATE properties SET cover_image = $1 WHERE id = $2",
      [image_url, req.params.id]
    );

    res.json({ message: "L’image de couverture a été définie avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur du serveur" });

   
  }
});

/* =========================
   MY PROPERTIES
========================= */


app.post("/register-owner",
  body("email").isEmail().withMessage("Email invalide"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Mot de passe doit contenir au moins 6 caractères"),
  body("first_name").notEmpty().withMessage("Prénom requis"),
  body("last_name").notEmpty().withMessage("Nom requis"),
  body("phone").notEmpty().withMessage("Téléphone requis"),

  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { first_name, last_name, email, phone, password, conditions, commission } = req.body;

      if (!first_name || !last_name || !email || !phone || !password || !conditions || !commission) {
        return res.status(400).json({ message: "Tous les champs sont obligatoires" });
      }
      // 🔍 تحقق من وجود المستخدم
      const existing = await pool.query(
        "SELECT id FROM users WHERE email=$1",
        [email]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ message: "Email déjà utilisé" });
      }

      // 🔐 تشفير الباسورد
      const hashed = await bcrypt.hash(password, 10);

      // 🆕 إنشاء owner (غير مُوافق عليه)
      await pool.query(`
        INSERT INTO users 
        (first_name, last_name, email, phone, password, role, approved, owner_request, conditions, commission)
        VALUES ($1,$2,$3,$4,$5,'owner',false,true,$6,$7)
      `, [first_name, last_name, email, phone, hashed, conditions, commission]);

      res.json({ message: "Compte propriétaire créé (en attente de validation)" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
});

app.get("/my-properties", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM properties WHERE owner_id = $1",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* =========================
   AUTH
========================= */

app.get("/admin/owners-full", auth, adminOnly, async (req, res) => {
  const result = await pool.query(`
    SELECT 
      id,
      first_name,
      last_name,
      email,
      phone,
      conditions,
      commission,
      owner_ref,
      banned  
    FROM users
    WHERE role = 'owner'
    ORDER BY id DESC
  `);
  res.json(result.rows);
});

// 🆕 لغير المسجلين
app.post("/owner-request-public", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, conditions, commission } = req.body;

    // 🔥 هنا تختار ماذا تفعل:
    // إما تخزنهم في DB
    await pool.query(
      `INSERT INTO owner_requests_public 
      (first_name, last_name, email, phone, conditions, commission)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [first_name, last_name, email, phone, conditions, commission]
    );

    res.json({ message: "Demande envoyée (public) ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRes = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: "Email ou mot de passe incorrect" });
    }

    

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Email ou mot de passe incorrect"
      });
    }

    if (user.banned) {
      return res.status(403).json({
        message: "Compte bloqué"
      });
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 🔥 نحفظه في DB (مهم للتحكم)
    await pool.query(
      "UPDATE users SET refresh_token = $1 WHERE id = $2",
      [refreshToken, user.id]
    );

    // 🍪 نحطه في cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // في production HTTPS
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken
    });


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.post("/refresh-token", async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    // 🔥 تحقق أنه موجود في DB (مهم جدًا)
    const userRes = await pool.query(
      "SELECT refresh_token FROM users WHERE id=$1",
      [decoded.id]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].refresh_token !== token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const user = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [decoded.id]
    );

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        role: user.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
});   

app.post("/logout", auth, async (req,res)=>{
  try{

    await pool.query(
      `UPDATE users
       SET refresh_token = NULL,
           last_logout = NOW()
       WHERE id=$1`,
      [req.user.id]
    );

    res.clearCookie("refreshToken");

    res.json({message:"Logged out"});

  }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});


app.get("/me", auth, async (req, res) => {
  const user = await pool.query(
    `SELECT first_name, last_name, email, phone, owner_ref, role, approved 
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json(user.rows[0]);
});

/* =========================
   REQUESTS
========================= */

app.post("/budget-request", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      zone,
      house_type,
      budget,
      user_type,
      students_number,
      note
    } = req.body;

    await pool.query(
      `INSERT INTO budget_requests 
      (first_name, last_name, email, phone, zone, house_type, budget, user_type, students_number, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [first_name, last_name, email, phone, zone, house_type, budget, user_type, students_number, note]
    );

    
    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject: `Budget d' utilisateur  ${first_name} ${last_name}`,
      text: `
      Zone: ${zone}
      Type: ${house_type}
      Budget: ${budget}
      User: ${user_type}
      `
      });

    res.json({ message: "Demande envoyée avec succès" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/project-request", async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      country,
      project_type,
      budget,
      land_status,
      ideas
    } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    // 💾 حفظ في قاعدة البيانات
    await pool.query(
      `INSERT INTO diaspora_requests 
      (full_name, email, phone, country, project_type, budget, land_status, ideas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [full_name, email, phone, country, project_type, budget, land_status, ideas]
    );

    // 📩 إرسال للإيميل (كما عندك)
    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject:  `🏗️ Projet d' un diaspora - ${full_name}`,
      text: `
      Nom: ${full_name}
      Email: ${email}
      Téléphone: ${phone}
      Pays: ${country}

      Type: ${project_type}
      Budget: ${budget}
      Terrain: ${land_status}

      Idées:
      ${ideas}
      `
    });

    res.json({ message: "Demande envoyée avec succès" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/admin/diaspora", auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM diaspora_requests ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.delete("/admin/diaspora/:id", auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM diaspora_requests WHERE id=$1",
      [req.params.id]
    );

    res.json({ message: "Deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/admin/reply-diaspora", auth, adminOnly, async (req, res) => {
  try {
    const { email, message } = req.body;


    
    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject: "Réponse de S.O.S LOGEMENT",
      text: message
    });

    res.json({ message: "Reply sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* =========================
  Complaints ROUTES
========================= */

app.post("/complaints", async (req, res) => {
  const { first_name, last_name, email, tel, house_name, house_location, cause } = req.body;

  try {

    // ✅ حفظ في DB (اختياري)
    await pool.query(
      `INSERT INTO complaints 
      (first_name, last_name, email, tel, house_name, house_location, cause)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [first_name, last_name, email, tel, house_name, house_location, cause]
    );


    // 🔥 إرسال إلى freshdesk
    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject: `⚖️ Porteur du plainte ${first_name} ${last_name}`,
      text: `
        Nom: ${first_name} ${last_name}
        Email: ${email}
        Tel: ${tel}

        Maison: ${house_name}
        Lieu: ${house_location}

        Cause:
        ${cause}
      `
      });

    res.status(201).json({ message: "Complaint sent to freshdesk ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
  ADMIN ROUTES
========================= */

app.put("/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const userRes = await pool.query(
    "SELECT password FROM users WHERE id=$1",
    [req.user.id]
  );

  const user = userRes.rows[0];

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Ancien mot de passe incorrect" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password=$1 WHERE id=$2",
    [hashed, req.user.id]
  );

  res.json({ message: "Mot de passe mis à jour" });
});

app.get("/admin/all-owner-requests", auth, adminOnly, async (req, res) => {
  try {

    // 1. المستخدمين المسجلين
    const registered = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        conditions,
        commission,
        'registered' AS source
      FROM users
      WHERE owner_request = true AND approved = false
    `);

    // 2. غير المسجلين
    const publicReq = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        conditions,
        commission,
        'public' AS source
      FROM owner_requests_public
    `);

    // دمج النتائج
    const result = [
      ...registered.rows,
      ...publicReq.rows
    ];

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.delete("/admin/public-owner-delete/:id", auth, adminOnly, async (req,res)=>{
  await pool.query(
    "DELETE FROM owner_requests_public WHERE id=$1",
    [req.params.id]
  );

  res.json({message:"Deleted"});
});


app.post("/admin/public-owner-approve/:id", auth, adminOnly, async (req, res) => {
  try {

    const request = await pool.query(
      "SELECT * FROM owner_requests_public WHERE id=$1",
      [req.params.id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const r = request.rows[0];

    // 👇 توليد reference
    function numberToLetters(num) {
      let letters = '';
      while (num >= 0) {
        letters = String.fromCharCode((num % 26) + 65) + letters;
        num = Math.floor(num / 26) - 1;
      }
      return letters;
    }

    const result = await pool.query(
      "SELECT MAX(owner_sequence) as max FROM users WHERE owner_sequence IS NOT NULL"
    );

    let next = result.rows[0].max !== null
      ? result.rows[0].max + 1
      : 0;

    const ref = numberToLetters(next) + "0";

    const hashedPassword = await bcrypt.hash("temp12345", 10);

    await pool.query(
      `INSERT INTO users 
      (first_name, last_name, email, phone, role, approved, password, owner_ref, owner_request, conditions, commission)
      VALUES ($1,$2,$3,$4,'owner',true,$5,$6,false,$7,$8)`,
      [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        hashedPassword,
        ref,
        r.conditions,
        r.commission
      ]
    );

    await pool.query(
      "DELETE FROM owner_requests_public WHERE id=$1",
      [req.params.id]
    );

    res.json({ message: "Public user approved as owner", ref });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/admin/owner-requests", auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, owner_request, approved 
       FROM users 
       WHERE owner_request = true AND approved = false
       ORDER BY id DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/admin/properties", auth, adminOnly, async (req, res) => {
  try {
   const result = await pool.query(`
      SELECT
        p.*,
        u.first_name,
        u.last_name,
        u.phone,
        u.owner_ref,
        u.email,

        (
          SELECT json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'type', pi.type
            )
          )
          FROM property_images pi
          WHERE pi.property_id = p.id
        ) AS images

      FROM properties p
      JOIN users u
      ON p.owner_id = u.id

      WHERE p.status='pending'

      ORDER BY p.id DESC
    `);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/admin/properties/:id/approve", auth, adminOnly, async (req, res) => {
  
  try {

    const property = await pool.query(
      "SELECT * FROM properties WHERE id = $1",
      [req.params.id]
    );

    if (property.rows.length === 0) {
      return res.status(404).json({ message: "Bien introuvable" });
    }

    await pool.query(
      "UPDATE properties SET status = 'approved' WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: "Bien approuvé avec succès" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.put("/admin/properties/:id/hide", auth, adminOnly, async (req,res)=>{
await pool.query(
"UPDATE properties SET status='hidden' WHERE id=$1",
[req.params.id]
);
res.json({message:"Hidden"});
});

app.get("/owner/properties/:id", auth, async (req,res)=>{

const result = await pool.query(
`
SELECT
p.*,

(
SELECT json_agg(
json_build_object(
'id',pi.id,
'url',pi.image_url,
'type',pi.type
)
)
FROM property_images pi
WHERE pi.property_id=p.id
) AS images

FROM properties p
WHERE p.id=$1
AND p.owner_id=$2
`,
[
req.params.id,
req.user.id
]
);

if(!result.rows.length){
return res.status(404).json({
message:"Bien introuvable"
});
}

res.json(result.rows[0]);

});

app.put("/owner/properties/:id", auth, async (req, res) => {
  try {

    const check = await pool.query(
      `SELECT *
       FROM properties
       WHERE id=$1
       AND owner_id=$2`,
      [req.params.id, req.user.id]
    );

    if (!check.rows.length) {
      return res.status(403).json({
        message: "Accès refusé"
      });
    }

    const {
      title,
      type,
      description,
      city,
      exact_location,
      price,
      chambres,
      cuisine,
      sdb,
      salon,
      is_student,
      max_students,
      surface_m2
    } = req.body;

    await pool.query(
      `UPDATE properties
       SET
         title=$1,
         type=$2,
         description=$3,
         city=$4,
         exact_location=$5,
         price=$6,
         chambres=$7,
         cuisine=$8,
         sdb=$9,
         salon=$10,
         is_student=$11,
         max_students=$12,
         surface_m2=$13,
         status='pending'  
       WHERE id=$14`,
      [
        title,
        type,
        description,
        city,
        exact_location,
        price,
        chambres,
        cuisine,
        sdb,
        salon,
        is_student,
        max_students,
        surface_m2,
        req.params.id
      ]
    );
    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject: "🏠 Modification d'un bien",
      text: `
      Un propriétaire a modifié un bien.

      ID Bien: ${req.params.id}

      Le bien est repassé en attente de validation.
    `
    });

    res.json({
      message: "Modification enregistrée"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Erreur serveur"
    });
  }
});


app.put(
"/owner/properties/:id/hide",
auth,

async(req,res)=>{

try{

const property =
await pool.query(
`
SELECT *
FROM properties
WHERE id=$1
AND owner_id=$2
`,
[
req.params.id,
req.user.id
]
);

if(!property.rows.length){
return res.status(404).json({
message:"Bien introuvable"
});
}

await pool.query(
`
UPDATE properties
SET status='hidden'
WHERE id=$1
`,
[
req.params.id
]
);

res.json({
message:"Bien masqué"
});

}catch(err){

console.error(err);

res.status(500).json({
message:"Erreur serveur"
});

}

});

app.get(
"/owner/properties-hidden",
auth,

async(req,res)=>{

try{

const result =
await pool.query(
`
SELECT *
FROM properties
WHERE owner_id=$1
AND status='hidden'
ORDER BY id DESC
`,
[
req.user.id
]
);

res.json(
result.rows
);

}catch(err){

console.error(err);

res.status(500).json({
message:"Erreur serveur"
});

}

});

app.put(
"/owner/properties/:id/restore",
auth,

async(req,res)=>{

try{

const property =
await pool.query(
`
SELECT *
FROM properties
WHERE id=$1
AND owner_id=$2
`,
[
req.params.id,
req.user.id
]
);

if(!property.rows.length){

return res.status(404).json({
message:"Bien introuvable"
});

}

await pool.query(
`
UPDATE properties
SET status='approved'
WHERE id=$1
`,
[
req.params.id
]
);

res.json({
message:"Bien republié"
});

}catch(err){

console.error(err);

res.status(500).json({
message:"Erreur serveur"
});

}

});

app.delete(
"/owner/properties/:id/delete-confirm",

auth,

async(req,res)=>{

try{

const {
password
}
=
req.body;

const user =
await pool.query(
`
SELECT password
FROM users
WHERE id=$1
`,
[
req.user.id
]
);

const ok =
await bcrypt.compare(
password,
user.rows[0].password
);

if(!ok){

return res.status(403).json({
message:
"Mot de passe incorrect"
});

}

const property =
await pool.query(
`
SELECT *
FROM properties
WHERE id=$1
AND owner_id=$2
`,
[
req.params.id,
req.user.id
]
);

if(
!property.rows.length
){

return res.status(404).json({
message:
"Bien introuvable"
});

}

await pool.query(
`
DELETE
FROM properties
WHERE id=$1
`,
[
req.params.id
]
);

res.json({
message:
"Bien supprimé"
});

}catch(err){

console.error(err);

res.status(500).json({
message:
"Erreur serveur"
});

}

});


/* =========================
   DELETE OWNER PROPERTY
========================= */

app.delete("/owner/properties/:id", auth, async (req,res)=>{
  try{

    const property = await pool.query(
      `
      SELECT *
      FROM properties
      WHERE id=$1
      AND owner_id=$2
      `,
      [
        req.params.id,
        req.user.id
      ]
    );

    if(!property.rows.length){
      return res.status(404).json({
        message:"Bien introuvable"
      });
    }

    const images = await pool.query(
      `
      SELECT *
      FROM property_images
      WHERE property_id=$1
      `,
      [req.params.id]
    );

    for(const img of images.rows){

      if(img.public_id){

        await cloudinary.uploader.destroy(
          img.public_id,
          {
            resource_type:
            img.type === "video"
            ? "video"
            : "image"
          }
        );

      }

    }

    await pool.query(
      "DELETE FROM properties WHERE id=$1",
      [req.params.id]
    );

    res.json({
      message:"Bien supprimé"
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      message:"Erreur serveur"
    });
  }
});

app.post(
"/owner/properties/:id/images",
auth,
upload.array("media",10),

async(req,res)=>{

try{

const property = await pool.query(
`
SELECT *
FROM properties
WHERE id=$1
AND owner_id=$2
`,
[
req.params.id,
req.user.id
]
);

if(!property.rows.length){
return res.status(403).json({
message:"Accès refusé"
});
}

for(const file of req.files){

const result =
await streamUpload(file.buffer);

await pool.query(
`
INSERT INTO property_images
(property_id,image_url,public_id,type)
VALUES($1,$2,$3,$4)
`,
[
req.params.id,
result.secure_url,
result.public_id,
result.resource_type
]
);

}

res.json({
message:"Images ajoutées"
});

}catch(err){
console.error(err);
res.status(500).json({
message:"Erreur serveur"
});
}

});

app.delete(
"/owner/images/:id",
auth,

async(req,res)=>{

try{

const image = await pool.query(
`
SELECT
pi.*,
p.owner_id
FROM property_images pi
JOIN properties p
ON pi.property_id = p.id
WHERE pi.id=$1
`,
[req.params.id]
);

if(!image.rows.length){
return res.status(404).json({
message:"Image introuvable"
});
}

if(
image.rows[0].owner_id !== req.user.id
){
return res.status(403).json({
message:"Accès refusé"
});
}

await cloudinary.uploader.destroy(
image.rows[0].public_id,
{
resource_type:
image.rows[0].type === "video"
? "video"
: "image"
}
);

await pool.query(
"DELETE FROM property_images WHERE id=$1",
[req.params.id]
);

res.json({
message:"Image supprimée"
});

}catch(err){
console.error(err);
res.status(500).json({
message:"Erreur serveur"
});
}

});
app.put("/admin/users/:id/approve-owner", auth, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    function numberToLetters(num) {
      let letters = '';
      while (num >= 0) {
        letters = String.fromCharCode((num % 26) + 65) + letters;
        num = Math.floor(num / 26) - 1;
      }
      return letters;
    }

    const result = await pool.query(
      "SELECT MAX(owner_sequence) as max FROM users WHERE owner_sequence IS NOT NULL"
    );

    let next = result.rows[0].max !== null
      ? result.rows[0].max + 1
      : 0;

    const ref = numberToLetters(next) + "0";

    await pool.query(`
      UPDATE users 
      SET 
        role = 'owner',
        approved = true,
        owner_request = false,
        owner_ref = $2,
        owner_sequence = $3
      WHERE id = $1
    `, [userId, ref, next]);
    await transporter.sendMail({
      from: '"S.O.S LOGEMENT" <' + process.env.EMAIL+ '>',
      to: user.rows[0].email,
      subject: "Validation de votre compte propriétaire",
      html: `
      <div style="font-family: Arial, sans-serif; background-color:#f6f6f6; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; padding:30px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
          
          <h2 style="color:#2c3e50; text-align:center;">
            Validation de votre compte propriétaire
          </h2>

          <p style="color:#333; font-size:15px;">
            Bonjour,
          </p>

          <p style="color:#333; font-size:15px;">
            Nous avons le plaisir de vous informer que votre demande de création de compte 
            <strong>propriétaire</strong> sur la plateforme <strong>sos.logement.com</strong> a été 
            <span style="color:green; font-weight:bold;">validée avec succès</span>.
          </p>

          <p style="color:#333; font-size:15px;">
            Votre référence propriétaire est la suivante :
          </p>

          <div style="text-align:center; margin:20px 0;">
            <span style="display:inline-block; background:#f1f1f1; padding:10px 20px; border-radius:6px; font-size:18px; font-weight:bold; color:#2c3e50;">
              ${ref}
            </span>
          </div>

          <p style="color:#333; font-size:15px;">
            Nous vous invitons à conserver cette référence précieusement, elle pourra vous être demandée lors de vos futures démarches.
          </p>

          <p style="color:#333; font-size:15px;">
            Vous pouvez désormais accéder à votre espace et publier vos biens en toute sécurité.
          </p>

          <hr style="border:none; border-top:1px solid #eee; margin:25px 0;">

          <p style="color:#777; font-size:13px; text-align:center;">
            Cet email est généré automatiquement, merci de ne pas y répondre.<br>
            © ${new Date().getFullYear()} S.O.S LOGEMENT — Tous droits réservés
          </p>

        </div>
      </div>
      `
    });
    res.json({ message: "Propriétaire approuvé", reference: ref });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.delete("/admin/images/:id", auth, adminOnly, async (req,res)=>{
  try {

    // 1️⃣ نجيب الصورة
    const result = await pool.query(`
      SELECT property_images.public_id,
       property_images.type,
       properties.owner_id
      FROM property_images
      JOIN properties ON property_images.property_id = properties.id
      WHERE property_images.id = $1
    `, [req.params.id]);
    if(
      req.user.role !== "admin" &&
      result.rows[0].owner_id !== req.user.id
    ){
      return res.status(403).json({message:"Unauthorized"});
    }

    if(result.rows.length === 0){
      return res.status(404).json({message:"Image not found"});
    }
    const public_id = result.rows[0].public_id;

    // 2️⃣ نحذف من Cloudinary
    await cloudinary.uploader.destroy(
      public_id,
      {
        resource_type:
          result.rows[0].type === "video"
            ? "video"
            : "image"
      }
    );

    // 3️⃣ نحذف من DB
    await pool.query(
      "DELETE FROM property_images WHERE id=$1",
      [req.params.id]
    );

    res.json({message:"Image deleted from DB & Cloudinary ✅"});

  } catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});

app.delete("/admin/users/:id", auth, adminOnly, async (req,res)=>{
  try{

    const user = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [req.params.id]
    );

    if(!user.rows.length){
      return res.status(404).json({message:"Utilisateur introuvable"});
    }

    if(user.rows[0].role === "admin"){
      return res.status(403).json({message:"Impossible de supprimer admin"});
    }

    await pool.query("DELETE FROM users WHERE id=$1",[req.params.id]);

    res.json({message:"Utilisateur supprimé"});

    }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});

app.get("/admin/properties-approved", auth, adminOnly, async (req,res)=>{
  try{

    const result = await pool.query(`
      SELECT
        p.*,
        u.first_name,
        u.last_name,
        u.phone,
        u.owner_ref,
        u.email,

        (
          SELECT json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'type', pi.type
            )
          )
          FROM property_images pi
          WHERE pi.property_id = p.id
        ) AS images

      FROM properties p
      JOIN users u
      ON p.owner_id = u.id

      WHERE p.status='approved'

      ORDER BY p.id DESC
    `);

    res.json(result.rows);

    }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});

app.get("/admin/properties-hidden", auth, adminOnly, async (req,res)=>{
  try{

    const result = await pool.query(`
      SELECT
        p.*,
        u.first_name,
        u.last_name,
        u.phone,
        u.owner_ref,
        u.email,

        (
          SELECT json_agg(
            json_build_object(
              'id', pi.id,
              'url', pi.image_url,
              'type', pi.type
            )
          )
          FROM property_images pi
          WHERE pi.property_id = p.id
        ) AS images

      FROM properties p
      JOIN users u
      ON p.owner_id = u.id

      WHERE p.status='hidden'

      ORDER BY p.id DESC
    `);

    res.json(result.rows);

    }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});
app.put("/admin/properties/:id/restore", auth, adminOnly, async (req,res)=>{
  await pool.query(
    "UPDATE properties SET status='approved' WHERE id=$1",
    [req.params.id] // ✅ فقط هذا
  );

  res.json({message:"Restored"});
});

app.delete("/admin/properties/:id", auth, adminOnly, async (req,res)=>{
  try{

    const images = await pool.query(
      "SELECT public_id, type FROM property_images WHERE property_id=$1",
      [req.params.id]
    );

    for (const img of images.rows) {

      await cloudinary.uploader.destroy(
        img.public_id,
        {
          resource_type:
            img.type === "video"
              ? "video"
              : "image"
        }
      );

    }

    await pool.query("DELETE FROM properties WHERE id=$1",[req.params.id]);

    res.json({message:"Property deleted"});
    }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});

app.put("/admin/properties/:id", auth, adminOnly, async (req,res)=>{
  try{

    const { price, city } = req.body;
      await pool.query(
      "UPDATE properties SET price=$1, city=$2 WHERE id=$3",
      [price, city, req.params.id]
    );

    res.json({message:"Updated successfully"});

  }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});

app.post("/admin/properties/:id/images", auth, adminOnly, upload.array("media", 10), async (req, res) => {
  try {

    const propertyId = req.params.id;

    const oldImages = await pool.query(
      "SELECT public_id, type FROM property_images WHERE property_id=$1",
      [propertyId]
    );

    for (const img of oldImages.rows) {

      await cloudinary.uploader.destroy(
        img.public_id,
        {
          resource_type:
            img.type === "video"
              ? "video"
              : "image"
        }
      );

    }

    await pool.query(
      "DELETE FROM property_images WHERE property_id=$1",
      [propertyId]
    );

    for (const file of req.files) {
      const result = await streamUpload(file.buffer);

      await pool.query(
        "INSERT INTO property_images (property_id, image_url, public_id, type) VALUES ($1,$2,$3,$4)",
        [propertyId, result.secure_url, result.public_id, result.resource_type]
      );
    }

    res.json({ message: "Images updated by admin ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/admin/send-mail", auth, adminOnly, async (req,res)=>{

try{

const { message, role } = req.body;

let users;

if(role === "all"){
users = await pool.query("SELECT email FROM users");
}else{
users = await pool.query(
"SELECT email FROM users WHERE role = $1",
[role]
);
}

for(const user of users.rows){
await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
subject: "Message de l'administration",
html: `<p>${message}</p>`
});

}

res.json({message:"Emails envoyés"});

}catch(err){
console.error(err);
res.status(500).json({message:"Erreur serveur"});
}

});

app.post("/admin/send-one-mail", auth, adminOnly, async (req,res)=>{
  try{

    const { email, message } = req.body;
    await transporter.sendMail({
      from: `"S.O.S LOGEMENT" <${process.env.EMAIL}>`,

      replyTo: email,

      to: process.env.EMAIL,
      subject: "Message de l'administration",
      html: `<p>${message}</p>`
    });

    res.json({message:"Email envoyé"});

  }catch(err){
    console.error(err);
    res.status(500).json({message:"Erreur serveur"});
  }
});

app.put("/admin/users/:id/ban", auth, adminOnly, async (req,res)=>{
await pool.query("UPDATE users SET banned=true WHERE id=$1",[req.params.id]);
res.json({message:"Banned"});
});

app.put("/admin/users/:id/unban", auth, adminOnly, async (req,res)=>{
await pool.query("UPDATE users SET banned=false WHERE id=$1",[req.params.id]);
res.json({message:"Unbanned"});
});

app.get("/admin/students", auth, adminOnly, async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 5; // عدد المستخدمين في الصفحة
  const offset = (page - 1) * limit;

  const result = await pool.query(
    "SELECT id, email FROM users WHERE role='student' ORDER BY id DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  res.json(result.rows);
});

app.get("/admin/seekers", auth, adminOnly, async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  const result = await pool.query(
    "SELECT id, email FROM users WHERE role='seeker' ORDER BY id DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  res.json(result.rows);
});

app.get("/admin/stats", auth, adminOnly, async (req,res)=>{
try{

const totalUsers = await pool.query(
  "SELECT COUNT(*) FROM users"
);

const owners = await pool.query(
"SELECT COUNT(*) FROM users WHERE role='owner'"
);

const bannedUsers = await pool.query(
"SELECT COUNT(*) FROM users WHERE banned=true"
);

const pendingProperties = await pool.query(
"SELECT COUNT(*) FROM properties WHERE status='pending'"
);

const approvedProperties = await pool.query(
  "SELECT COUNT(*) FROM properties WHERE status='approved'"
);

const totalProperties = await pool.query(
"SELECT COUNT(*) FROM properties"
);

const students = await pool.query(
  "SELECT COUNT(*) FROM users WHERE role='student'"
);

const seekers = await pool.query(
  "SELECT COUNT(*) FROM users WHERE role='seeker'"
);

res.json({

  totalUsers: totalUsers.rows[0].count,
  owners: owners.rows[0].count,
  bannedUsers: bannedUsers.rows[0].count,
  pendingProperties: pendingProperties.rows[0].count,
  approvedProperties: approvedProperties.rows[0].count,
  totalProperties: totalProperties.rows[0].count,
  students: students.rows[0].count,
  seekers: seekers.rows[0].count,
  visitors: visitors
});

}catch(err){
console.error(err);
res.status(500).json({message:"Erreur serveur"});
}
});

app.get("/admin/search", auth, adminOnly, async (req, res) => {
  try {

    const q = req.query.q?.trim();

    console.log("SEARCH QUERY:", q);
    console.log("CODE RECEIVED:", req.params.code);


    if (!q) {
      return res.json([]);
    }

    const search = `%${q}%`;

    // ================= USERS =================
    const users = await pool.query(`
      SELECT
        'user' AS type,
        id,
        first_name,
        last_name,
        email,
        role,
        owner_ref
      FROM users
      WHERE
        LOWER(COALESCE(first_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(last_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(email,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(owner_ref,'')) LIKE LOWER($1)
    `, [search]);

    // ================= PROPERTIES =================
    const properties = await pool.query(`
      SELECT
        'property' AS type,
        p.id,
        p.property_code,
        p.title,
        p.city,
        p.status,
        p.price,
        u.first_name,
        u.last_name,
        u.owner_ref
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE
        LOWER(COALESCE(p.property_code,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(p.title,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(p.city,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(u.owner_ref,'')) LIKE LOWER($1)
    `, [search]);

    // ================= DIASPORA =================
    const diaspora = await pool.query(`
      SELECT
        'diaspora' AS type,
        id,
        full_name,
        email,
        phone,
        country,
        project_type
      FROM diaspora_requests
      WHERE
        LOWER(COALESCE(full_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(email,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(phone,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(country,'')) LIKE LOWER($1)
    `, [search]);

    // ================= BUDGET =================
    const budgets = await pool.query(`
      SELECT
        'budget' AS type,
        id,
        first_name,
        last_name,
        email,
        phone,
        zone,
        budget
      FROM budget_requests
      WHERE
        LOWER(COALESCE(first_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(last_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(email,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(phone,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(zone,'')) LIKE LOWER($1)
    `, [search]);

    // ================= COMPLAINTS =================
    const complaints = await pool.query(`
      SELECT
        'complaint' AS type,
        id,
        first_name,
        last_name,
        email,
        tel,
        house_name,
        house_location
      FROM complaints
      WHERE
        LOWER(COALESCE(first_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(last_name,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(email,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(tel,'')) LIKE LOWER($1)
        OR LOWER(COALESCE(house_name,'')) LIKE LOWER($1)
    `, [search]);

    // دمج جميع النتائج
    const results = [
      ...users.rows,
      ...properties.rows,
      ...diaspora.rows,
      ...budgets.rows,
      ...complaints.rows
    ];

    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));