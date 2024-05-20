import express from 'express';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaClient, Prisma} from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json())

const jwtSecret = "someshit"
const prisma =new PrismaClient()

interface IRequest extends Request{
    userId?:string
}

const hashgenerator = async(password:string)=>{
    try {
        const saltRound =5;
        const salt = await bcrypt.genSalt(saltRound);

        const hash = await bcrypt.hash(password, salt);
        return hash;
        
    } catch (error) {
        console.error('Error generating password hash:', error);
        throw error;
    }
}

const hashCompare = async(inPass:string, hashFromDB:string)=>{
    try {
        const isMatch = await bcrypt.compare(inPass, hashFromDB);
        return isMatch;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

const jwtverify = async(req:IRequest, res:Response, next:NextFunction)=>{
    const authHead = req.headers.authorization;
    if(!authHead)return res.status(401).json({ message: 'No token provided' });
    const token = authHead.split(' ')[1];
    try {
        const decodeJwt = jwt.verify(token, jwtSecret) as JwtPayload;
        if(!decodeJwt) return res.status(401).json({ message: 'verification failed' });
        req.userId = decodeJwt.id;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
}

app.post("/signup", async(req, res)=>{
    const {email, password, username} = req.body;
    try {
        const user = await prisma.user.findUnique({
            where:{
                email:email
            }
        })

        if(user) return res.status(409).json({message:"email already in use"});
        const hashedPassword = await hashgenerator(password);
        const newUser = await prisma.user.create({
            data:{
                email:email,
                userName:username,
                password:hashedPassword
            }
        })
        if(newUser){
            const token = jwt.sign({id:newUser.userId}, jwtSecret ,{expiresIn: "24h"});
            res.status(200).json({message: "successfully signed up!",token })
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})
    }
})

app.post("/login", async(req, res)=>{
    const {email, password} = req.body;
    try {
        const user = await prisma.user.findUnique({
            where:{
                email:email
            }
        })

        if(user){
            const verify = await hashCompare(password, user.password);
            if(verify) {
                const token = jwt.sign({ id: user.userId }, jwtSecret ,{ expiresIn: "24h" });
                res.status(200).json({message:`logged in successfully`, token })
            }
            res.status(401).json({message:"wrong password"})
        }res.status(404).json({message:"user not found"});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})
    }
})

app.put("/createadmin", jwtverify, async(req:IRequest, res)=>{
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

app.get("/product/all", async(req, res)=>{
    const ammountOfProductOnPage  = 10;
    let pageNumerParam = req.query.pageNumber as string | undefined;
    let pageSizeParam = req.query.page_size as string | undefined
    try {
        const pageNumber = pageNumerParam ? parseInt(pageNumerParam) : 1;
        const page_size = pageSizeParam ? parseInt(pageSizeParam) : ammountOfProductOnPage;

        const offset = (pageNumber - 1) * page_size

        const totalCount = await prisma.product.count();
        const totalPages = Math.ceil(totalCount/page_size)

        const product = await prisma.product.findMany({
            take:page_size,
            skip:offset
        });

        if(!product || product.length === 0) res.status(404).json({message: "no product found"})
        res.status(200).json({message:"list of product", product, currentPage:pageNumber, totalPages: totalPages });
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})


app.get("/product/:productId", async(req, res)=>{
    try {
        const productId = req.params.productId;

        const product = await prisma.product.findUnique({
            where:{
                productId:productId
            }
        })

        if(!product)res.status(404).json({message: "no product found"});
        res.status(200).json({message:"product found", product});

    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

app.get("/product/:categorieId", async(req, res)=>{
    try {
        const categorieId = req.params.categorieId;
        const products = await prisma.product.findMany({
            where:{
                categoryId: categorieId
            }
        }) 
        if(!products)res.status(404).json({message: "no products found"});
        res.status(200).json({message:"products found", products});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error}) 
    }
})

app.get("/categories/all", async(req, res)=>{
    try {
        const categories = await prisma.category.findMany();
        if(!categories)res.status(404).json({message: "no categories found"});
        res.status(200).json({message:"categories found", categories});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})  
    }
})

app.post("/category",jwtverify,  async(req, res)=>{
    try {
        const {categoryName, categoryDescription} = req.body;
        const category = await prisma.category.create({
            data:{
                categoryName:categoryName,
                categoryDescription:categoryDescription
            }
        })

        if(!category) res.status(422).json({message:"unable to create category"});
        res.status(200).json({message:"category created successfully", category})
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error})  
    }
})

app.post("/product", jwtverify, async(req:IRequest, res)=>{
    const adminId = req.userId ;
    const {productName, productDescription, productPrice, quantity, categoriesId} = req.body;
    if(!adminId) return res.status(404).json({message:"no adminId found"})
    try {
        const product = await prisma.product.create({
            data:{
                productName:productName,
                productDescription:productDescription,
                productPrice:productPrice,
                quantity:quantity,
                adminId: adminId, 
                categoryId:categoriesId
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

app.put("/product/:productId", jwtverify, async(req:IRequest, res)=>{
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

app.delete("/product/:productId", jwtverify, async(req:IRequest, res)=>{
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

app.get("/cart", jwtverify, async(req:IRequest, res)=>{
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

app.post("/cart/:productId", jwtverify, async(req:IRequest, res)=>{
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

app.delete("/cart/:productId", jwtverify, async(req:IRequest, res)=>{
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

app.post("/order/:cartId", jwtverify, async(req:IRequest, res)=>{
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

app.delete("/order/:orderId", jwtverify, async(req:IRequest, res)=>{
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


app.get("/health", (req, res)=>{
    res.status(200).json({message:"this is from server"});
})


app.listen(3000, ()=>console.log("server is listening at 3000"))