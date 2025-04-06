
const express=require('express')
const bucket = require('./firebase');
require('dotenv').config();
const fs = require("node:fs/promises");
const sharp = require('sharp');
const multer = require("multer");
const path=require('node:path')
const cors = require('cors');
const nodemailer = require('nodemailer');
const cookieParser=require('cookie-parser')
const Database=require('better-sqlite3')
const { v4: uuidv4 } = require("uuid");
const { register } = require('node:module');
const db=new Database('./LaSophy.db')
const app=express()
const uniqueId = uuidv4();
app.use(cors({
    origin: ["http://localhost:3000","https://la-sophy-my-project.vercel.app"], 
    credentials: true 
}

));
app.use("/PDFdb", express.static(path.join(__dirname, "PDFdb")));
app.use("/imgCover", express.static(path.join(__dirname, "imgCover")));
app.use("/themeCover",express.static(path.join(__dirname, "themeCover")));
//app.use(express.static('./public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
//解析解密cook
app.use(cookieParser('LaSophy3724'))
// make sure the difference between req.cookies: not signed, req.signedCookies: signed
//for bookcover

// Storage
  const pdfupload = multer({ storage: multer.memoryStorage() });
  const imgupload = multer({ storage: multer.memoryStorage() });
  const mapupload=multer({ storage: multer.memoryStorage() });
  const mapcoverupload=multer({ storage: multer.memoryStorage()});


app.use((req, res, next)=>{
    const userId = req.signedCookies.loginUser;
    const userType = req.signedCookies.userType;
    let user = null;

  if (userType === 'admin') {
    user = db.prepare('SELECT * FROM admin_users WHERE uni_code = ?').get(userId);
  } else if (userType === 'user') {
    user = db.prepare('SELECT * FROM users WHERE uni_code = ?').get(userId);
  }
    res.locals.loginUser=user
    res.locals.isLogin=!!user//public information, i don't need to 
    next()
})
app.get('/api/books', async (req, res, next)=>{
  try{
    const books=db.prepare("SELECT * FROM books").all()
    res.json(books);
  }catch(err){
    console.error('Error fetching books:', err);
    res.status(500).json({ message: 'Server error' });
  

  }
})

app.get('/PDFreader/:pdf_path', (req,res,next)=>{
    try {
        let collect_or_not=false
        let book_collects=null
        let like_or_not=false
        var pdf_path = req.params.pdf_path;
        var targetbook = db.prepare("SELECT * FROM books WHERE pdf_path = ? ").get(pdf_path);//the tip: using get, will obtain object
        var comments = db.prepare('SELECT * FROM bookcomments WHERE cmt_book = ? ORDER BY COALESCE(parentId, commentId), createdAt;').all(pdf_path);
        var totalLikes=db.prepare('SELECT COUNT(*) AS count FROM likes WHERE pdf_path=?').get(pdf_path)
        var totalCollects=db.prepare('SELECT COUNT(*) AS count FROM collects WHERE pdf_path=?').get(pdf_path)
        if (req.signedCookies.loginUser){
         collect_or_not=!!db.prepare('SELECT * FROM collects WHERE uni_code=? AND pdf_path=?').get(res.locals.loginUser.uni_code, pdf_path)
         like_or_not=!!db.prepare('SELECT * FROM likes WHERE uni_code=? AND pdf_path=?').get(res.locals.loginUser.uni_code, pdf_path)
         book_collects=db.prepare(`SELECT collects.uni_code, collects.pdf_path, collects.username, books.title, books.author, books.year, books.img_path
            FROM collects 
            JOIN books ON collects.pdf_path = books.pdf_path
            WHERE collects.uni_code=?`)
            .all(res.locals.loginUser.uni_code)
        }
        if (!targetbook) {
            return res.status(404).json({ message: 'Book not found' });
        }
        return res.json({ 
            book: targetbook, 
            comments: comments, 
            currentUser: res.locals.loginUser ? res.locals.loginUser : null, 
            like_or_not: like_or_not, 
            totalLikes: totalLikes.count,
            totalCollects:totalCollects.count,
            collect_or_not:collect_or_not,
            book_collects: book_collects,
        });

    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
})
app.get('/', (req, res ,next) => {
    if (!req.signedCookies.loginUser){
        return res.json({ loginOrnot: res.locals.isLogin, currentUser: res.locals.loginUser});
    } 
    res.json({ loginOrnot: res.locals.isLogin, currentUser: res.locals.loginUser});
});

app.post('/interactives',(req, res, next)=>{
    if(!req.signedCookies.loginUser){
        return res.json({message: 'Please login first'})
    }
    try{
    var Inter_Info=req.body
    const targetFoundorNot=db.prepare('SELECT * FROM likes WHERE uni_code=? AND pdf_path=?').get(Inter_Info.currentUser.uni_code, Inter_Info.pdf_path)
    if(targetFoundorNot){
        db.prepare('DELETE FROM likes WHERE uni_code=? AND pdf_path=?').run(Inter_Info.currentUser.uni_code, Inter_Info.pdf_path)
        var updatedDelLikes=db.prepare('SELECT COUNT(*) as count FROM likes WHERE pdf_path=?').get(Inter_Info.pdf_path)
        return res.json({ message: "Cancel like", change_likes:updatedDelLikes.count});
    }else {
    db.prepare(`INSERT INTO likes (uni_code, username, pdf_path) VALUES (?, ?, ?)`)
     .run(Inter_Info.currentUser.uni_code, 
       Inter_Info.currentUser.username,
       Inter_Info.pdf_path);
       var updatedPlusLikes=db.prepare('SELECT COUNT(*) as count FROM likes WHERE pdf_path=?').get(Inter_Info.pdf_path)
       return res.json({ message: "Like" , change_likes:updatedPlusLikes.count});
      }
    } catch(err){
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
     

})

app.post('/collects',(req, res, next)=>{
    if(!req.signedCookies.loginUser){
        return res.json({message: 'Please login first'})
    }
    try{
    var Collect_Info=req.body
    const targetFoundorNot=db.prepare('SELECT * FROM collects WHERE uni_code=? AND pdf_path=?').get(Collect_Info.currentUser.uni_code, Collect_Info.pdf_path)
    if(targetFoundorNot){
        db.prepare('DELETE FROM collects WHERE uni_code=? AND pdf_path=?').run(Collect_Info.currentUser.uni_code, Collect_Info.pdf_path)
        var updatedDelCollects=db.prepare('SELECT COUNT(*) as count FROM collects WHERE pdf_path=?').get(Collect_Info.pdf_path)
        var collectDelBooks=db.prepare(`SELECT collects.uni_code, collects.pdf_path, collects.username, books.title, books.author, books.year, books.img_path
            FROM collects 
            JOIN books ON collects.pdf_path = books.pdf_path
            WHERE collects.uni_code=?`)
            .all(Collect_Info.currentUser.uni_code)//using join on 
        return res.json({ message: "Cancel collect", change_collects:updatedDelCollects.count, BookCollects:collectDelBooks});
    }else {
    db.prepare(`INSERT INTO collects (uni_code, username, pdf_path) VALUES (?, ?, ?)`)
     .run(Collect_Info.currentUser.uni_code, 
       Collect_Info.currentUser.username,
       Collect_Info.pdf_path);
       var updatedPlusCollects=db.prepare('SELECT COUNT(*) as count FROM collects WHERE pdf_path=?').get(Collect_Info.pdf_path)
       var collectAddBooks=db.prepare(`SELECT collects.uni_code, collects.pdf_path, collects.username, books.title, books.author, books.year, books.img_path
        FROM collects 
        JOIN books ON collects.pdf_path = books.pdf_path
        WHERE collects.uni_code=?`)
        .all(Collect_Info.currentUser.uni_code)
       return res.json({ message: "Collect" , change_collects:updatedPlusCollects.count, BookCollects:collectAddBooks});
      }
    } catch(err){
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
     

})
app.post('/cancelcollects',(req,res,next)=>{
      const{uni_code, pdf_path}=req.body
      db.prepare('DELETE FROM collects WHERE uni_code=? AND pdf_path=?').run(uni_code, pdf_path)
      var after_CancelCollects=db.prepare(`SELECT collects.uni_code, collects.pdf_path, collects.username, books.title, books.author, books.year, books.img_path
        FROM collects 
        JOIN books ON collects.pdf_path = books.pdf_path
        WHERE collects.uni_code=?`)
        .all(uni_code)
    res.json({message: "Delete collects", CollectBooks: after_CancelCollects})
})
app.post('/comments', (req,res,next)=>{
    if(!req.signedCookies.loginUser){
        return res.json({message: 'Please login first'})
    }
    const content=req.body.content
    const createdBy=req.body.createdBy
    const cmt_book=req.body.cmt_book
    const parentId=req.body.parentId
    const parentIdUsername=req.body.parentIdUsername
    const uni_code=req.body.uni_code
    const like=req.body.like
    const comment={
        content,
        createdBy,
        createdAt: new Date().toISOString(),
        cmt_book,
        parentId,
        like,
        parentIdUsername,
        uni_code,
    }
      const stmt=db.prepare(`
        INSERT INTO bookcomments(content, createdBy, createdAt, cmt_book, parentId, like, parentIdUsername, uni_code)
        VALUES ($content, $createdBy, $createdAt, $cmt_book, $parentId, $like, $parentIdUsername, $uni_code)
        `);
      const result=stmt.run(comment)
      const newComment = db.prepare("SELECT * FROM bookcomments WHERE commentId = ?").get(result.lastInsertRowid);
        res.json({message: 'Comment Successfully',comment: newComment})

})

app.get('/:username/:uni_code', (req, res, next)=>{
    if(!req.signedCookies.loginUser){
        return res.json({message: 'Please login first'})
    }
     try{
        var uniquecode=req.params.uni_code
        var targetUser = db.prepare(" SELECT * FROM users WHERE uni_code = ? ").get(uniquecode);
        var targetUserInfo = db.prepare(" SELECT * FROM userinf WHERE uni_code = ? ").get(uniquecode);
        
        if (!targetUser) {
            return res.status(404).json({ message: 'user not exist' });
        }
        var userCollectBooks=db.prepare(`SELECT collects.uni_code, collects.pdf_path, collects.username, books.title, books.author, books.year, books.img_path
            FROM collects 
            JOIN books ON collects.pdf_path = books.pdf_path
            WHERE collects.uni_code=?`)
            .all(uniquecode)

        return res.json({userInfo: targetUser, userProfile: targetUserInfo, userCollectBooks:userCollectBooks? userCollectBooks: null })
     }
     catch(error){
        console.error("Database error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
     }

})
app.post('/settings/profile',(req, res, next)=>{
    var updateInfo=req.body
    var existUserinfo=db.prepare('SELECT * FROM userinf WHERE uni_code = ?').get (updateInfo.uni_code)
    var existUser = db.prepare('SELECT * FROM users WHERE uni_code = ?').get(updateInfo.uni_code);
    const hasChanges =
    updateInfo.username !== existUser.username ||
    updateInfo.email !== existUser.email ||
    updateInfo.bio !== existUserinfo.bio ||
    updateInfo.ideology !== existUserinfo.ideology;
  if (hasChanges){
    db.prepare(`
        UPDATE users 
        SET username = ?, email = ? 
        WHERE uni_code = ?
      `).run(updateInfo.username, updateInfo.email, updateInfo.uni_code);
  
      // Update userinf table
      db.prepare(`
        UPDATE userinf 
        SET bio = ?, ideology = ?, username = ?, email = ?
        WHERE uni_code = ?
      `).run(updateInfo.bio, updateInfo.ideology, updateInfo.username, updateInfo.email, updateInfo.uni_code);

      var updatedUserInfo= db.prepare('SELECT * FROM userinf WHERE uni_code = ?').get(updateInfo.uni_code);
      if (updatedUserInfo) {
        res.json({ message: 'Update successful', updatedInfo: updatedUserInfo });
      } else {
        res.json({ message: 'Update failed'});
      }
  } else{
      res.json({message: 'Update successful'})
  }
})
app.post('/recommend', (req,res,next)=>{
    try{
        const updatedRecommend=req.body;
        if(updatedRecommend.recommend){
        db.prepare(`INSERT INTO recommend (uni_code, username, pdf_path, recommend) VALUES
            ($uni_code, $username, $pdf_path, $recommend)
            `).run(updatedRecommend)
        const currentUserRecommend=db.prepare('SELECT * FROM recommend WHERE uni_code=?').all(updatedRecommend.uni_code)
        return res.json({message: 'Recommend successful', userRecommend: currentUserRecommend})

        }else{
            return res.json({message: 'Recommend cannot be empty!'})
        }

    }catch(err){
        console.error('Error inserting recommendation:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });

    }
})
app.post('/upload/map',(req,res,next)=>{
    mapupload.single("map")(req,res, async function(err) {

        if(err){
            return res.status(500).json({message: "Upload failed"})
        }
        if (!req.file){
            return res.status(400).json({message:"No map uploaded"})
        }
        const originalName = req.file.originalname;
          const mimetype = req.file.mimetype;
          const fileBuffer = req.file.buffer;

          const tempPath = `temMap/${originalName}`;
          const finalPath = `Mapdb/${originalName}`;
          try{
            const tempFile = bucket.file(tempPath);
            await tempFile.save(fileBuffer, {
              metadata: { contentType: mimetype },
            });
            const finalFile = bucket.file(finalPath);
            const [exists] = await finalFile.exists();
            if (exists) {
              await tempFile.delete();
              return res.status(409).json({
                message: "Map already exists",
                filename: originalName,
              });
            }
            await tempFile.copy(finalFile);
            await tempFile.delete();
            return res.status(200).json({
              message: "File uploaded successfully",
              filename: originalName
            });
          } catch (moveErr) {
            console.error("❌ Error moving file:", moveErr);
            return res.status(500).json({ message: "Failed to save file" });
          }
    
    })


})
app.get('/statistics',(req,res,next)=>{
    try{
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const registrationsByDate = db.prepare(`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM users
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `).all();
      const topCollectors = db.prepare(`
        SELECT username, COUNT(*) AS total
        FROM collects
        GROUP BY username
        ORDER BY total DESC
        LIMIT 5
      `).all();
      const mostCollectedBooks = db.prepare(`
        SELECT books.title, books.author, COUNT(*) as total
        FROM collects
        JOIN books ON collects.pdf_path = books.pdf_path
        GROUP BY collects.pdf_path
        ORDER BY total DESC
        LIMIT 5
      `).all();
      res.json({totalUsers: totalUsers.count,
        registrationsByDate,
        topCollectors,
        mostCollectedBooks})
    }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });

    }
})

app.post('/upload/map_cover', (req,res,next)=>{

    mapcoverupload.single("map_cover")(req, res, async function(err) {

        if(err){
            return res.status(500).json({message: "Upload failed"})
        }
        if (!req.file){
            return res.status(400).json({message:"No map cover uploaded"})
        }
        const originalName = req.file.originalname;
          const mimetype = req.file.mimetype;
          const fileBuffer = req.file.buffer;

          const tempPath = `temMapCover/${originalName}`;
          const finalPath = `mapCover/${originalName}`;
          try{
            const tempFile = bucket.file(tempPath);
            await tempFile.save(fileBuffer, {
              metadata: { contentType: mimetype },
            });
            const finalFile = bucket.file(finalPath);
            const [exists] = await finalFile.exists();
            if (exists) {
              await tempFile.delete();
              return res.status(409).json({
                message: "Mapcover already exists",
                filename: originalName,
              });
            }
            await tempFile.copy(finalFile);
            await tempFile.delete();
            return res.status(200).json({
              message: "File uploaded successfully",
              filename: originalName
            });
          } catch (moveErr) {
            console.error("❌ Error moving file:", moveErr);
            return res.status(500).json({ message: "Failed to save file" });
          }
    
    })


})


app.post('/upload/img',  (req, res, next)=>{
    imgupload.single("cover")(req, res, async function (err) {
        if (err) {
            return res.status(500).json({message: "Upload failed"});
          
        }

        if (!req.file) {
            return res.status(400).json({message: "No img uploaded"});
          }
          const originalName = req.file.originalname;
          const mimetype = req.file.mimetype;
          const fileBuffer = req.file.buffer;

          const tempPath = `temIMG/${originalName}`;
          const finalPath = `imgCover/${originalName}`;
          try{
            const tempFile = bucket.file(tempPath);
            await tempFile.save(fileBuffer, {
              metadata: { contentType: mimetype },
            });
            const finalFile = bucket.file(finalPath);
            const [exists] = await finalFile.exists();
            if (exists) {
              await tempFile.delete();
              return res.status(409).json({
                message: "Img already exists",
                filename: originalName,
              });
            }
            await tempFile.copy(finalFile);
            await tempFile.delete();
            return res.status(200).json({
              message: "File uploaded successfully",
              filename: originalName
            });
          } catch (moveErr) {
            console.error("❌ Error moving file:", moveErr);
            return res.status(500).json({ message: "Failed to save file" });
          }
      });

    

})

app.post('/upload/pdf',  (req, res, next)=>{
    pdfupload.single("file")(req, res, async function (err) {

        if (err) {
            console.log("now data looks like", req.body)
            return res.status(500).json({message: "Upload failed"});
          
        }

        if (!req.file) {
            console.warn("⚠️ No file uploaded");
            return res.status(400).json({message: "No file uploaded"});
          }
          
          const originalName = req.file.originalname;
          const mimetype = req.file.mimetype;
          const fileBuffer = req.file.buffer;

          const tempPath = `temPDF/${originalName}`;
          const finalPath = `PDFdb/${originalName}`;
          try{
            const tempFile = bucket.file(tempPath);
            await tempFile.save(fileBuffer, {
              metadata: { contentType: mimetype },
            });
            const finalFile = bucket.file(finalPath);
            const [exists] = await finalFile.exists();
            if (exists) {
              await tempFile.delete();
              return res.status(409).json({
                message: "Book already exists",
                filename: originalName,
              });
            }
            await tempFile.copy(finalFile);
            await tempFile.delete();
            return res.status(200).json({
              message: "File uploaded successfully",
              filename: originalName
            });
          } catch (moveErr) {
            console.error("❌ Error moving file:", moveErr);
            return res.status(500).json({ message: "Failed to save file" });
          }
      });

    

})
app.post('/upload/metadata', (req, res, next)=>{
    const{type, title, author, year}=req.body
    try{
        if(type==="book"){
         const   pdf_path = req.body.pdf_path;
         const  img_path = req.body.img_path;
       db.prepare(`INSERT INTO books (title, author, year, pdf_path, img_path) VALUES (?, ?, ?, ?, ?)`)
    .run(title, author, year, pdf_path, img_path)
        }else if (type==="map") {
            const   map_path = req.body.map_path;
            const  mapcover_path = req.body.mapcover_path;
            db.prepare(`INSERT INTO maps (title, author, year, pdf_path, img_path) VALUES (?, ?, ?, ?, ?)`)
            .run(title, author, year, map_path, mapcover_path)
        }else{
             res.json({message: "Upload successful"})
             }
    } catch(err){
        console.error("Insert error:", err.message);
        res.status(500).send("Failed to insert into database");
    }
})
app.post('/signup', (req,res,next)=>{
    var registerInfo=req.body

    delete registerInfo.confirmPassword;

    const record = verificationCodes[registerInfo.email];
    if (!record) {
    return res.status(400).json({ message: 'No code sent to this email' });
  }  
    if (Date.now() > record.expiresAt) {
    delete verificationCodes[registerInfo.email]; // clean up
    return res.status(400).json({ message: 'Verification code expired' });
  } 
    if (registerInfo.verify_code !== record.code) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }
     delete verificationCodes[registerInfo.email];

    registerInfo.createdAt=new Date().toISOString()
    var existUser=db.prepare('SELECT * FROM users WHERE email = ?').get (registerInfo.email)
    if(existUser){
        return res.json({ message: 'Email already exists' });
    }
    registerInfo.uni_code=uuidv4()
    db.prepare(`INSERT INTO users (username, password, email, createdAt, uni_code) 
    VALUES ($username, $password, $email, $createdAt, $uni_code)`
).run(registerInfo)
     db.prepare(`INSERT INTO userinf (uni_code, username, email) VALUES (?, ?, ? )`)
     .run(
        registerInfo.uni_code,
        registerInfo.username,
        registerInfo.email
     )
    res.json({ message: "Signup successful!" });
})


const verificationCodes = {};  // email -> code

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
app.post('/send_code', async (req, res, next)=>{
    const { email } = req.body;
    const code = generateCode();
    const expiresAt = Date.now() + 2 * 60 * 1000; 
  verificationCodes[email] = {code, expiresAt };;
  try {
    await transporter.sendMail({
      from: `"LaSophymoon" <linsophymoon@gmail.com>`,
      to: email,
      subject: 'Your Verification Code',
      text: `Thank you for signing up!`, 
      html: `
            <h2>Thank you for signing up!</h2>
            <p>Your verification code is:</p>
            <h1>${code}</h1>
            <p>This code will expire in 2 minutes.</p>
            `,
      replyTo: 'linsophymoon@gmail.com'
    });

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send email' });
  }

})
app.post('/login',(req, res, next)=>{
  const { email, password, isAdmin } = req.body;
  const table = isAdmin ? 'admin_users' : 'users';
  const user = db.prepare(`SELECT * FROM ${table} WHERE email = ?`).get(email);

  if (!user) {
    return res.json({ message: 'User not found' });
  }

  if (user.password !== password) {
    return res.json({ message: 'Invalid email or password' });
  }
    res.cookie('loginUser', user.uni_code,{
        signed: true,
        maxAge:86400 * 1000,
        httpOnly: true, // Prevents client-side access
        secure: process.env.NODE_ENV === 'production', // Ensures cookie is sent over HTTPS in production
        sameSite: 'lax' // Allows sending cookies when navigating from another site
    });
    res.cookie('userType', isAdmin ? 'admin' : 'user', {
        signed: true,
        maxAge: 86400 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    res.json({ message: 'Login successful'});


})
app.post('/findback', (req,res,next)=>{
    const {email}=req.body
    const targetUser=db.prepare('SELECT * FROM users WHERE email=?').get(email)
    if(targetUser){
         return res.json({message: "User exists"})
    }else{
         return res.json({message:"User not found"})
    }
})
const verificationCodes4Password= {};

app.post('/get_code', async(req,res,next)=>{
    const { email } = req.body;
    const code = generateCode();
    const expiresAt = Date.now() + 2 * 60 * 1000; 
  verificationCodes4Password[email] = {code, expiresAt };
  try {
    await transporter.sendMail({
      from: `"LaSophymoon" <linsophymoon@gmail.com>`,
      to: email,
      subject: 'Your Verification Code',
      text: `Forget your password?`, 
      html: `
            <h2>Forget your password?</h2>
            <p>Your verification code is:</p>
            <h1>${code}</h1>
            <p>This code will expire in 2 minutes.</p>
            `,
      replyTo: 'linsophymoon@gmail.com'
    });

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send email' });
  }
})

app.post('/verifycodeforpassword',(req,res,next)=>{
    const {code, email}=req.body
    const record = verificationCodes4Password[email];
    if (!record) {
    return res.status(400).json({ message: 'No code sent to this email' });
  }  
    if (Date.now() > record.expiresAt) {
    delete verificationCodes4Password[code]; // clean up
    return res.status(400).json({ message: 'Verification code expired' });
  } 
    if (code !== record.code) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }
     delete verificationCodes4Password[code];
     res.json({ message: "Verify successful!" })

})
app.post('/updatepassword', (req, res,next)=>{
   const {email, password}=req.body
   try{
   db.prepare('UPDATE users SET password=? WHERE email=?').run(password, email)
   const targetuser=db.prepare('SELECT * from users WHERE email=?').get(email)
   console.log('user', targetuser)
   res.json({message:"Update the password successful"})
}
    catch(error){
        console.error(err);
        res.status(500).json({ message: 'Failed to update the password' });
    }
})
app.get('/logout', (req, res, next)=>{
    res.clearCookie('loginUser')
    res.clearCookie('userType')
    res.json({ success: true, message: "Logged out successfully" });

})
 const PORT = process.env.PORT || 5001;
app.listen(PORT, ()=>{
    console.log(`server listening on ${PORT}`, PORT)
})