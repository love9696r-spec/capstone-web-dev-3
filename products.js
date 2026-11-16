const router=require("express").Router();
const Product=require("../models/Product");
const {protect,allowRoles}=require("../middleware/auth");
const {appEvents}=require("../events");
router.get("/",async(req,res,next)=>{
 try{
  const {search,category,minPrice,maxPrice,sort="createdAt",order="desc",page=1,limit=10}=req.query;
  const filter={isActive:true};
  if(search) filter.$text={$search:String(search)};
  if(category) filter.category=category;
  if(minPrice!==undefined||maxPrice!==undefined){filter.price={};if(minPrice!==undefined)filter.price.$gte=Number(minPrice);if(maxPrice!==undefined)filter.price.$lte=Number(maxPrice);if(Object.values(filter.price).some(Number.isNaN))return res.status(400).json({success:false,message:"Price filters must be numeric"});}
  const p=Math.max(1,parseInt(page)||1), l=Math.min(100,Math.max(1,parseInt(limit)||10));
  const allowed=["name","price","stock","createdAt"];const s=allowed.includes(sort)?sort:"createdAt";
  const [products,total]=await Promise.all([Product.find(filter).populate("category","name").populate("seller","name").sort({[s]:order==="asc"?1:-1}).skip((p-1)*l).limit(l),Product.countDocuments(filter)]);
  res.json({success:true,total,page:p,limit:l,totalPages:Math.ceil(total/l),products});
 }catch(e){next(e);}
});
router.get("/:id",async(req,res,next)=>{try{const product=await Product.findOne({_id:req.params.id,isActive:true}).populate("category","name").populate("seller","name");if(!product)return res.status(404).json({success:false,message:"Product not found"});res.json({success:true,product});}catch(e){next(e);}});
router.post("/",protect,allowRoles("seller","admin"),async(req,res,next)=>{try{const product=await Product.create({...req.body,seller:req.user._id});res.status(201).json({success:true,product});}catch(e){next(e);}});
router.patch("/:id",protect,allowRoles("seller","admin"),async(req,res,next)=>{try{const filter={_id:req.params.id};if(req.user.role==="seller")filter.seller=req.user._id;const product=await Product.findOneAndUpdate(filter,req.body,{new:true,runValidators:true});if(!product)return res.status(404).json({success:false,message:"Product not found or not owned by seller"});res.json({success:true,product});}catch(e){next(e);}});
router.delete("/:id",protect,allowRoles("seller","admin"),async(req,res,next)=>{try{const filter={_id:req.params.id};if(req.user.role==="seller")filter.seller=req.user._id;const product=await Product.findOneAndUpdate(filter,{isActive:false},{new:true});if(!product)return res.status(404).json({success:false,message:"Product not found or not owned by seller"});res.json({success:true,message:"Product deactivated"});}catch(e){next(e);}});
router.patch("/:id/stock",protect,allowRoles("seller","admin"),async(req,res,next)=>{try{
 const change=Number(req.body.change);if(!Number.isInteger(change)||change===0)return res.status(400).json({success:false,message:"change must be a non-zero integer"});
 const filter={_id:req.params.id,stock:{$gte:Math.max(0,-change)}};if(req.user.role==="seller")filter.seller=req.user._id;
 const product=await Product.findOneAndUpdate(filter,{$inc:{stock:change}},{new:true,runValidators:true});
 if(!product)return res.status(400).json({success:false,message:"Product unavailable, not owned by seller, or insufficient stock"});
 if(product.stock<=product.lowStockThreshold)appEvents.emit("stock-low",{product});
 res.json({success:true,product});
 }catch(e){next(e);}});
module.exports=router;