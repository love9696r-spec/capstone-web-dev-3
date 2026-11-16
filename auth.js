const router = require("express").Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const access = id => jwt.sign({ sub: id }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m" });
const refresh = id => jwt.sign({ sub: id, type: "refresh" }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d" });
const hash = token => crypto.createHash("sha256").update(token).digest("hex");

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ success:false, message:"Name, valid email and password (minimum 8 characters) are required" });
    const user = await User.create({ name, email, password, role:"customer" });
    res.status(201).json({ success:true, user:{ id:user._id, name:user.name, email:user.email, role:user.role } });
  } catch(e) { next(e); }
});
router.post("/login", async (req,res,next) => {
  try {
    const user = await User.findOne({ email:String(req.body.email || "").toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(req.body.password || ""))) return res.status(401).json({success:false,message:"Invalid email or password"});
    const accessToken = access(user.id), refreshToken = refresh(user.id);
    user.refreshTokenHash = hash(refreshToken); await user.save();
    res.json({success:true,accessToken,refreshToken,user:{id:user.id,name:user.name,email:user.email,role:user.role}});
  } catch(e){next(e);}
});
router.post("/refresh", async(req,res,next)=>{
  try {
    const token=req.body.refreshToken;
    if(!token) return res.status(401).json({success:false,message:"Refresh token required"});
    const payload=jwt.verify(token,process.env.JWT_REFRESH_SECRET);
    if(payload.type!=="refresh") return res.status(401).json({success:false,message:"Invalid refresh token"});
    const user=await User.findById(payload.sub).select("+refreshTokenHash");
    if(!user || user.refreshTokenHash!==hash(token)) return res.status(401).json({success:false,message:"Refresh token revoked or invalid"});
    const nextRefresh=refresh(user.id); user.refreshTokenHash=hash(nextRefresh); await user.save();
    res.json({success:true,accessToken:access(user.id),refreshToken:nextRefresh});
  }catch(e){res.status(401).json({success:false,message:"Invalid or expired refresh token"});}
});
router.post("/logout", protect, async(req,res,next)=>{
  try { const user=await User.findById(req.user.id).select("+refreshTokenHash"); user.refreshTokenHash=undefined; await user.save(); res.json({success:true,message:"Logged out; refresh token invalidated"}); }catch(e){next(e);}
});
router.get("/me",protect,(req,res)=>res.json({success:true,user:{id:req.user.id,name:req.user.name,email:req.user.email,role:req.user.role}}));
module.exports=router;