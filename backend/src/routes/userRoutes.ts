import express,{Request, Response} from "express";
import { IRequest } from "../types/irequest";
import { jwtverify, } from "../middlerware/jwtverify";
import { prisma } from "..";
import { Prisma } from "@prisma/client";


const router = express.Router();


router.get("/categories/all", async(_req:IRequest, res:Response)=>{
    try {
        const categories = await prisma.category.findMany();
        if(!categories)res.status(404).json({message: "no categories found"});
        res.status(200).json({message:"categories found", categories});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})  
    }
})


router.get("/cart", jwtverify, async(req:IRequest, res:Response)=>{
    const userId = req.userId;
    if(!userId) return res.status(404).json({message:"no userId found"})
    try {
        const cart = await prisma.cart.findUnique({
            where:{
                userId:userId
            }
        })

        if(!cart) return res.status(422).json({message: "cart not found please create new cart"});
        res.status(200).json({message: "here is your cart", cart});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.post("/cart/:productId", jwtverify, async(req:IRequest, res:Response)=>{
    const userId = req.userId ;
    const productId = req.params.productId
    const {quantity, price} = req.body
    if(!userId) return res.status(404).json({message:"no userId found"})
    try {
        const cart = await prisma.cart.findUnique({
            where:{
                userId: userId
            }
        })

        if(cart){
            const newCartItemTotal = new Prisma.Decimal(quantity).mul(new Prisma.Decimal(price));
            const cartPriceUpdate = new Prisma.Decimal(cart.totalPrice).plus(new Prisma.Decimal(newCartItemTotal));

            await prisma.cart.update({where:{cartId:cart.cartId},
            data:{
                cartitems:{create:[{
                    productId:productId,
                    quantity:quantity,
                    totalPrice:newCartItemTotal
                }]},
                totalPrice:  cartPriceUpdate
            }})
            res.status(200).json({message:"item added to the cart"})

        }else{
            const newCartItemTotal = new Prisma.Decimal(quantity).mul(new Prisma.Decimal(price));
            const newCart = await prisma.cart.create({
                data:{
                    userId:userId,
                    cartitems:{create:[{
                        productId:productId,
                        quantity:quantity,
                        totalPrice: newCartItemTotal
                    }]},

                    totalPrice: newCartItemTotal,

                }
            })
            res.status(200).json({message:"item added to the cart", newCart})
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.delete("/cart/:productId", jwtverify, async(req:IRequest, res:Response)=>{
    const userId = req.userId;
    const {quantity, price} = req.body
    const productId = req.params.productId
    if(!userId) return res.status(404).json({message:"no userId found"});
    try {
        const cart = await prisma.cart.findUnique({
            where:{
                userId:userId
            },
            include:{
                cartitems:{
                    where:{
                        productId:productId
                    }
                }
            }
        })

        if(!cart) return res.status(404).json({ message: 'Cart not found for the user' });
        if(cart.cartitems.length === 0) return res.status(404).json({ message: 'Product not found in the cart' });

        await prisma.cartItem.deleteMany({
            where:{
                cartId:cart.cartId,
                productId: productId
            }
        })

        const cartCurrentPrice = new Prisma.Decimal(cart.totalPrice);
        const newCartCurrentPrice = cartCurrentPrice.sub(new Prisma.Decimal(price * quantity));
        await prisma.cart.update({
            where:{
                userId:userId
            },
            data:{
                totalPrice: newCartCurrentPrice
            }
        })

        res.status(200).json({message:"item removed from the cart"});

    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.post("/order/:cartId", jwtverify, async(req:IRequest, res:Response)=>{
    const userId = req.userId;
    const {cartId} = req.params;
    try {
        const cart = await prisma.cart.findUnique({
            where:{
                cartId
            },
            include:{
                cartitems:{include:{product:true}}
            }
        })

        if (!cart || cart.userId !== userId) {
            return res.status(404).json({ message: 'Cart not found or does not belong to the user' });
        }

        const newOrder = await prisma.order.create({
            data:{
                userId:userId,
                status: "pending",
                totalAmount:cart.totalPrice,
                orderItems:{create:cart.cartitems.map(items=>({
                    productId:items.productId,
                    quantity:items.quantity,
                    price:items.product.productPrice,
                }))}
            },
            include:{
                orderItems:true
            }
        })
        await prisma.cart.update({
            where:{
                cartId
            },
            data:{
                cartitems:{deleteMany:{}},
                totalPrice:0
            }
        })
        await prisma.user.update({
            where:{
                userId:userId
            },
            data:{
                Cart:{disconnect:true},
                orders:{connect:{orderId:newOrder.orderId}}
            }
        })

        res.status(200).json({message:"order placed successfully, cart is emptied", newOrder})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

router.delete("/order/:orderId", jwtverify, async(req:IRequest, res:Response)=>{
    const orderId = req.params.orderId;
    const userId = req.userId;
    try {
        await prisma.order.delete({
            where:{
                orderId
            }
        })

        await prisma.user.update({
            where:{
                userId
            },
            data:{
                orders:{deleteMany:{}}
            }
        })
        res.status(200).json({message:"order cancelled"})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})


export default router;