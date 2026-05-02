const express = require("express");
const app = express();

require("dotenv").config();
console.log("CLOUD NAME:", process.env.CLOUDINARY_CLOUD_NAME);


const path = require("path");

const { body, validationResult } = require("express-validator");




const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const streamifier = require("streamifier");

const bcrypt = require('bcrypt');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./db');

const router = express.Router();
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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


app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let visitors = 0;

app.use((req, res, next) => {
  if (!req.headers.authorization) {
    visitors++;
  }
  next();
});
console.log("DIR NAME:", __dirname);


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


app.post("/contact", async (req, res) => {
  const { full_name, email, phone, subject, message, is_owner } = req.body;

  await transporter.sendMail({
    to: "support@sossnlogement.freshdesk.com",
    subject: `📩 Contactez-nous ${full_name}`,
    text: `
  Nom: ${full_name}
  Email: ${email}
  Téléphone: ${phone}

  Sujet:
  ${subject}

  Message:
  ${message}

  Est-ce qu' il est bailleur ? : ${is_owner}
    `
  });

  res.json({ success: true });
});


app.use("/", router);





/* =========================
   PROPERTIES (PUBLIC)
========================= */

app.get("/properties", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT 
        p.*,
        u.first_name,
        u.last_name,
        u.phone,
        u.owner_ref,
        ARRAY(
          SELECT json_build_object(
            'id', id,
            'url', image_url
          )
          FROM property_images
          WHERE property_id = p.id
        ) AS images
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'approved'
      ORDER BY p.id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur /properties, async (req, res" });
  }
});

app.get("/property/:code", async (req, res) => {
  try {
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

const user = userFromDB.rows[0];

if (user.role !== "owner" || user.approved !== true) {
  return res.status(403).json({ message: "Accès refusé" });
}

    const ownerId = req.user.id;
    const { title, type, description, city, exact_location, price, chambres, cuisine, sdb, salon, is_student, max_students } = req.body;

    const owner = await pool.query(
      "SELECT owner_ref FROM users WHERE id = $1",
      [ownerId]
    );

    if (!owner.rows[0]) {
      return res.status(404).json({ message: "Propriétaire non trouvé" });
    }

    const prefix = owner.rows[0].owner_ref;

    const lastCodeRes = await pool.query(
      "SELECT property_code FROM properties WHERE owner_id = $1 ORDER BY id DESC LIMIT 1",
      [ownerId]
    );

    let newNumber = 1;
    if (lastCodeRes.rows[0]) {
      const lastCode = lastCodeRes.rows[0].property_code;
      const numPart = parseInt(lastCode.slice(prefix.length), 10);
      newNumber = numPart + 1;
    }

    const propertyCode =
      newNumber < 10000
        ? `${prefix}${String(newNumber).padStart(4, "0")}`
        : `${prefix}${newNumber}`;

      // تنظيف السعر من فراغات أو فاصلة
      let cleanedPrice = Number(price.toString().replace(/\s/g,'').replace(/,/g,''));
      if(isNaN(cleanedPrice)){
        return res.status(400).json({ message: "Prix invalide" });
      }
    const result = await pool.query(
      `INSERT INTO properties 
       (owner_id, property_code, title, type, description, city, exact_location, price, chambres, cuisine, sdb, salon, is_student, max_students, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING *`,
      [ownerId, propertyCode, title, type, description, city, exact_location, cleanedPrice, chambres, cuisine, sdb, salon, is_student, max_students]
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
        resource_type: "auto"
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

app.post("/properties/:id/images", auth, upload.array("media", 10), async (req, res) => {
  try {

      console.log("FILES:", req.files);


    const propertyId = req.params.id;

    // 🔥 1. جلب الصور القديمة
    const oldImages = await pool.query(
      "SELECT public_id FROM property_images WHERE property_id=$1",
      [propertyId]
    );

    // 🔥 2. حذفها من Cloudinary
    for (const img of oldImages.rows) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    // 🔥 3. حذفها من DB
    await pool.query(
      "DELETE FROM property_images WHERE property_id=$1",
      [propertyId]
    );

    // 🔥 4. رفع الصور الجديدة
    for (const file of req.files) {
      const result = await streamUpload(file.buffer);

      await pool.query(
        "INSERT INTO property_images (property_id, image_url, public_id, type) VALUES ($1,$2,$3,$4)",
        [propertyId, result.secure_url, result.public_id, result.resource_type]
      );
    }

    res.json({ message: "Images replaced ✅" });

  } catch (err) {
    console.error("UPLOAD ERROR FULL:", err);
    res.status(500).json({ message: "Erreur serveur" });
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
      first_name,
      last_name,
      email,
      phone,
      conditions,
      commission,
      owner_ref  
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

    // أو فقط تبعث email
    /*
    await transporter.sendMail({
      to: "support@sossnlogement.freshdesk.com",
      subject: "Nouvelle demande propriétaire (non inscrit)",
      text: `
      Nom: ${first_name} ${last_name}
      Email: ${email}
      Téléphone: ${phone}

      Conditions:
      ${conditions}

      Commission: ${commission}
            `
          });
          */

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
      return res.status(400).json({ message: "Email ou mot de passe incorrect" });
    }

    if(user.banned){
      return res.status(403).json({message:"Compte bloqué"});
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // قصير
    );

    res.json({
      message: "Connexion réussie",
      token
    });


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/logout", auth, async (req,res)=>{
  try{
    await pool.query(
      "UPDATE users SET last_logout = NOW() WHERE id = $1",
      [req.user.id]
    );

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
        to:"support@sossnlogement.freshdesk.com",
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


    await pool.query(
      `INSERT INTO project_requests
      (full_name, email, phone, country, project_type, budget, land_status, ideas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [full_name, email, phone, country, project_type, budget, land_status, ideas]
      
    );
    await transporter.sendMail({
      to: "support@sossnlogement.freshdesk.com",
      subject: `🏗️ Construire Project - ${full_name}`,
      text: `
    Nom: ${full_name}
    Email: ${email}
    Téléphone: ${phone}
    Pays: ${country}

    Type de projet: ${project_type}
    Leur budget: ${budget}
    Chercheur du maison: ${land_status}

    Leur Idées:
    ${ideas}
      `
    });
    res.json({ message: "Demande envoyée avec succès" });

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
      to: "support@sossnlogement.freshdesk.com", // ← غيّر هذا
      subject: ` ⚖️ Porteur du plainte ${first_name} ${last_name}`,
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
      SELECT p.*, 
              u.first_name, 
              u.last_name, 
              u.phone, 
              u.owner_ref,
              u.email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'pending'
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

    await pool.query(
      `UPDATE users 
      SET 
        role = 'owner',
        approved = true,
        owner_request = false
      WHERE id = $1`,
      [userId]
    );
    await transporter.sendMail({
      from: '"S.O.S LOGEMENT" <' + process.env.EMAIL_USER + '>',
      to: user.rows[0].email,
      subject: "Validation de votre compte propriétaire",
      html: `
        <h2>Félicitations !</h2>
        <p>Votre référence: <b>${ref}</b></p>
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
      SELECT property_images.public_id, properties.owner_id
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
    await cloudinary.uploader.destroy(public_id);

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
      SELECT p.*, 
              u.first_name, 
              u.last_name, 
              u.phone, 
              u.owner_ref,
              u.email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'approved'
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
      SELECT p.*, 
              u.first_name, 
              u.last_name, 
              u.phone, 
              u.owner_ref,
              u.email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'hidden'
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
      "SELECT public_id FROM property_images WHERE property_id=$1",
      [req.params.id]
    );

    for(const img of images.rows){
      await cloudinary.uploader.destroy(img.public_id);
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
      "SELECT public_id FROM property_images WHERE property_id=$1",
      [propertyId]
    );

    for (const img of oldImages.rows) {
      await cloudinary.uploader.destroy(img.public_id);
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
from: process.env.EMAIL_USER,
to: user.email,
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
      from: process.env.EMAIL_USER,
      to: email,
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
  const q = req.query.q?.replace(/\s/g, "").toLowerCase();

  if (!q) return res.json([]);

  const result = await pool.query(
  `SELECT id, first_name, last_name, email, role, banned, owner_ref
   FROM users
   WHERE
   to_tsvector('simple',
     COALESCE(first_name,'') || ' ' ||
     COALESCE(last_name,'') || ' ' ||
     COALESCE(email,'') || ' ' ||
     COALESCE(owner_ref,'')
   )
   @@ plainto_tsquery('simple', $1)
   ORDER BY id DESC`,
  [q]
);

  res.json(result.rows);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
