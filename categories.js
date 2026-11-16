const router=require("express").Router();
const Category=require("../models/Category");
const {protect,allowRoles}=require("../middleware/auth");
router.get("/",async(req,res,next)=>{try{res.json({success:true,categories:await Category.find().sort({name:1})});}catch(e){next(e);}});
router.post("/",protect,allowRoles("admin"),async(req,res,next)=>{try{const category=await Category.create(req.body);res.status(201).json({success:true,category});}catch(e){next(e);}});
router.patch("/:id",protect,allowRoles("admin"),async(req,res,next)=>{try{const category=await Category.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!category)return res.status(404).json({success:false,message:"Category not found"});res.json({success:true,category});}catch(e){next(e);}});
router.delete("/:id",protect,allowRoles("admin"),async(req,res,next)=>{try{const category=await Category.findByIdAndDelete(req.params.id);if(!category)return res.status(404).json({success:false,message:"Category not found"});res.json({success:true,message:"Category deleted"});}catch(e){next(e);}});
module.exports=router;