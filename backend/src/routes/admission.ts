import express,{Request, Response} from "express";
import { IRequest } from "../types/irequest";
import jwt from 'jsonwebtoken'
import { hashCompare, hashgenerator } from "../passwordHashers/passHash";
import { jwtSecret } from "../middlerware/jwtverify";
import { prisma } from "..";

const router = express.Router();


router.post("/signup", async(req:IRequest, res:Response)=>{
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

router.post("/login", async(req:IRequest, res:Response)=>{
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

export default router;