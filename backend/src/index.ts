import express from 'express';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const app = express();

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
    const isMatch = await bcrypt.compare(inPass, hashFromDB);
    return isMatch;
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
                userId:uuidv4(),
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
        res.status(500).json({message : error})
    }
})

app.get("/allproduct", async(req, res)=>{
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
        res.status(500).json({message : error}) 
    }
})



app.get("/health", (req, res)=>{
    res.status(200).json({message:"this is from server"});
})


app.listen(3000, ()=>console.log("server is listening at 3000"))