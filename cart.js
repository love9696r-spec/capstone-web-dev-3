const router=require("express").Router();
const Cart=require("../models/Cart");
const Product=require("../models/Product");
const {protect,allowRoles}=require("../middleware/auth");
router.use(protect,allowRoles("customer"));
router.get("/",async(req,res,next)=>{try{const cart=await Cart.findOne({customer:req.user._id}).populate("items.product","name price stock isActive");res.json({success:true,cart:cart||{items:[]}});}catch(e){next(e);}});
router.post("/items",async(req,res,next)=>{try{
 const quantity=Number(req.body.quantity),product=await Product.findOne({_id:req.body.productId,isActive:true});
 if(!product)return res.status(404).json({success:false,message:"Product not found"});
 if(!Number.isInteger(quantity)||quantity<1||quantity>product.stock)return res.status(400).json({success:false,message:"Invalid quantity or insufficient stock"});
 let cart=await Cart.findOne({customer:req.user._id});if(!cart)cart=await Cart.create({customer:req.user._id,items:[]});
 const item=cart.items.find(i=>String(i.product)===String(product._id));
 if(item)item.quantity+=quantity;else cart.items.push({product:product._id,quantity});
 await cart.save();await cart.populate("items.product","name price stock");res.status(201).json({success:true,cart});
 }catch(e){next(e);}});
router.patch("/items/:productId",async(req,res,next)=>{try{
 const quantity=Number(req.body.quantity);if(!Number.isInteger(quantity)||quantity<1)return res.status(400).json({success:false,message:"quantity must be a positive integer"});
 const product=await Product.findOne({_id:req.params.productId,isActive:true});if(!product||quantity>product.stock)return res.status(400).json({success:false,message:"Product unavailable or insufficient stock"});
 const cart=await Cart.findOne({customer:req.user._id});if(!cart)return res.status(404).json({success:false,message:"Cart not found"});
 const item=cart.items.find(i=>String(i.product)===req.params.productId);if(!item)return res.status(404).json({success:false,message:"Cart item not found"});
 item.quantity=quantity;await cart.save();await cart.populate("items.product","name price stock");res.json({success:true,cart});
 }catch(e){next(e);}});
router.delete("/items/:productId",async(req,res,next)=>{try{const cart=await Cart.findOne({customer:req.user._id});if(!cart)return res.status(404).json({success:false,message:"Cart not found"});cart.items=cart.items.filter(i=>String(i.product)!==req.params.productId);await cart.save();res.json({success:true,cart});}catch(e){next(e);}});
module.exports=router;