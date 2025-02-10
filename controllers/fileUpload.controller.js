const jwt = require('jsonwebtoken');
const multer  = require('multer')
const path = require("path");

const fileSizeLimit = 2 * 1024 * 1024; 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix =  Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const formattedDate = new Date().toISOString().split("T")[0];
        cb(null, `${baseName}-${formattedDate}-${uniqueSuffix}${ext}`); 
    }
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = [ "image/png"];
    // "image/jpeg"
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only  and PNG files are allowed!"), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: fileSizeLimit }, // 2MB limit
    fileFilter: fileFilter
});

module.exports = {
    upload:(req,res)=>{
        try {
            upload.single("file")(req, res, (err) => {
                if (err) {
                    console.log(err.message);
                    if (err instanceof multer.MulterError) {
                        return res.status(400).json({ error: `Multer error: ${err.message}` });
                    } else {
                        return res.status(400).json({ error: err.message });
                    }
                }
                if (!req.file) {
                    return res.status(400).json({ error: "No file uploaded or file type is not allowed" });
                }
        
                res.json({ message: "File uploaded successfully", filename: req.file.filename });
            })
        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: "error", message: "Internal server error" });
        }
    }
}