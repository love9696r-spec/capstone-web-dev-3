const router=require("express").Router();
const mongoose=require("mongoose");
const Order=require("../models/Order");
const Cart=require("../models/Cart");
const Product=require("../models/Product");
const {protect,allowRoles}=require("../middleware/auth");
const {appEvents}=require("../events");
router.use(protect);
router.post("/",allowRoles("customer"),async(req,res,next)=>{
 const session=await mongoose.startSession();
 try{
  let createdOrder;
  await session.withTransaction(async()=>{
   const cart=await Cart.findOne({customer:req.user._id}).session(session);
   if(!cart||!cart.items.length)throw Object.assign(new Error("Cart is empty"),{statusCode:400});
   const orderItems=[];let total=0;
   for(const item of cart.items){
    const product=await Product.findOneAndUpdate({_id:item.product,isActive:true,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity}},{new:true,session});
    if(!product)throw Object.assign(new Error("A product is unavailable or has insufficient stock"),{statusCode:409});
    orderItems.push({product:product._id,seller:product.seller,name:product.name,unitPrice:product.price,quantity:item.quantity});
    total+=product.price*item.quantity;
   }
   const docs=await Order.create([{customer:req.user._id,items:orderItems,totalAmount:total,deliveryAddress:req.body.deliveryAddress,payment:"simulated_pending"}],{session});
   createdOrder=docs[0];
   cart.items=[];await cart.save({session});
  });
  appEvents.emit("order-placed",{order:createdOrder});
  res.status(201).json({success:true,order:createdOrder});
 }catch(e){if(e.statusCode)res.status(e.statusCode);next(e);}finally{await session.endSession();}
});
router.get("/my",allowRoles("customer"),async(req,res,next)=>{try{const orders=await Order.find({customer:req.user._id}).sort({createdAt:-1});res.json({success:true,orders});}catch(e){next(e);}});
router.get("/seller",allowRoles("seller","admin"),async(req,res,next)=>{try{const filter=req.user.role==="seller"?{"items.seller":req.user._id}:{};const orders=await Order.find(filter).sort({createdAt:-1});res.json({success:true,orders});}catch(e){next(e);}});
router.patch("/:id/status",allowRoles("seller","admin"),async(req,res,next)=>{
 try{
  const allowed=["processing","shipped","delivered","cancelled"];if(!allowed.includes(req.body.status))return res.status(400).json({success:false,message:"Invalid status"});
  const order=await Order.findById(req.params.id);if(!order)return res.status(404).json({success:false,message:"Order not found"});
  if(req.user.role==="seller"&&!order.items.some(i=>String(i.seller)===String(req.user._id)))return res.status(403).json({success:false,message:"Order does not belong to this seller"});
  const transitions={placed:["processing","cancelled"],processing:["shipped","cancelled"],shipped:["delivered"],delivered:[],cancelled:[]};
  if(!transitions[order.status].includes(req.body.status))return res.status(400).json({success:false,message:"Invalid order status transition"});
  if(req.body.status==="cancelled"){
   const session=await mongoose.startSession();await session.withTransaction(async()=>{for(const item of order.items)await Product.updateOne({_id:item.product},{$inc:{stock:item.quantity}},{session});order.payment="simulated_refunded";order.status="cancelled";await order.save({session});});await session.endSession();
  }else{order.status=req.body.status;await order.save();}
  appEvents.emit("order-status-changed",{order});res.json({success:true,order});
 }catch(e){next(e);}
});
router.get("/:id",async(req,res,next)=>{try{const order=await Order.findById(req.params.id);if(!order)return res.status(404).json({success:false,message:"Order not found"});const allowed=req.user.role==="admin"||String(order.customer)===String(req.user._id)||(req.user.role==="seller"&&order.items.some(i=>String(i.seller)===String(req.user._id)));if(!allowed)return res.status(403).json({success:false,message:"Forbidden"});res.json({success:true,order});}catch(e){next(e);}});
module.exports=router;