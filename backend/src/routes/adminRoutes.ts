import express,{Request, Response} from "express";
import { IRequest } from "../types/irequest";
import {  jwtverify } from "../middlerware/jwtverify";
import { prisma } from "..";
import path from "path";
import multer from "multer";


const router = express.Router();


router.put("/createadmin", jwtverify, async(req:IRequest, res:Response)=>{
    const userId = req.userId;
    if(!userId) return res.status(404).json({message:"user id not found"});
    try {
        const updateUser = await prisma.user.update({
            where:{
                userId:userId
            },
            data:{
                isAdmin:true
            }
        })

        res.status(200).json({message:"user updated to admin", updateUser})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})
    }
})


//image posting
let storagePath = path.join(__dirname,'..', 'uploads')
const storage = multer.diskStorage({
    destination:function(req, file, cb){
        cb(null, storagePath)
    },
    filename:function(req, file,cb){
        cb(null, `${Date.now()}_${file.originalname}`)
    }
})

const upload = multer({storage:storage});

router.post("/createProduct", jwtverify,upload.single('productImage'), async(req:IRequest, res:Response)=>{
    const adminId = req.userId ;
    const {productName, productDescription, productPrice, quantity, categoriesId} = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.fieldname}`: null
    if(!adminId) return res.status(404).json({message:"no adminId found"})
    try {
        const product = await prisma.product.create({
            data:{
                productName:productName,
                productDescription:productDescription,
                productPrice:productPrice,
                quantity:quantity,
                adminId: adminId, 
                categoryId:categoriesId,
                imageUrl:imageUrl
            }
        })

        if(!product) res.status(422).json({message:"unable to create product"});

        await prisma.user.update({
            where:{userId:adminId},
            data:{products:{connect:{productId:product.productId}}}
        })
        await prisma.category.update({
            where:{
                categoryId:categoriesId
            },
            data:{products:{connect:{productId:product.productId}}}
        })
        res.status(200).json({message:"product created successfully", product})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.put("/updateProduct/:productId", jwtverify, async(req:IRequest, res:Response)=>{
    const {productName, productDescription, productPrice, quantity, categoriesId} = req.body;
    const productId = req.params.productId;
    const adminId = req.userId;
    try {
        const foundProduct = await prisma.product.findUnique({
            where:{
                productId:productId
            }
        })
        if(!foundProduct) res.status(422).json({message:"product not found"});
        if(foundProduct?.adminId === adminId) res.status(403).json({message:"you are not authorized to change the product"});

        const updatedProduct = await prisma.product.update({
            where:{
                productId:productId
            }, data:{
                productName:productName,
                productDescription:productDescription,
                productPrice:productPrice,
                quantity:quantity,
                categoryId: categoriesId
            }
        })

        if(!updatedProduct) res.status(422).json({message:"unable to  update Product"});
        res.status(200).json({message:"updated Product  successfully", updatedProduct})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.delete("/deleteProduct/:productId", jwtverify, async(req:IRequest, res:Response)=>{
    const adminId = req.userId;
    const productId = req.params.productId;
    try {
        const foundProduct = await prisma.product.findUnique({
            where:{
                productId:productId
            }
        })
        if(!foundProduct) res.status(422).json({message:"product not found"});
        if(foundProduct?.adminId === adminId) res.status(403).json({message:"you are not authorized to delete the product"});

        const deleteProduct = await prisma.product.delete({
            where:{
                productId:productId
            }
        })

        await prisma.user.update({
            where:{userId:adminId},
            data:{products:{disconnect:{productId:foundProduct?.productId}}}
        });

        await prisma.category.update({
            where:{
                categoryId:foundProduct?.categoryId
            },
            data:{products:{connect:{productId:foundProduct?.productId}}}
        })
        if(!deleteProduct) res.status(422).json({message:"unable to  delete Product"});
        res.status(200).json({message:"deleted Product  successfully", deleteProduct,})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

export default router;