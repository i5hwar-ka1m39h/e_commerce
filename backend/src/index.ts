import express from 'express';
import { PrismaClient, Prisma} from '@prisma/client';

import path from 'path';
import userRoutes from './routes/userRoutes'
import adminRoutes from './routes/adminRoutes'
import productRoutes from './routes/proudctRoutes'
import superUserRoutes from './routes/superUser'
import admissionRoutes from './routes/admission'

const app = express();
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

export const prisma = new PrismaClient();

app.use("/api/admission", admissionRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/superuser", superUserRoutes)


app.get("/health", (req, res)=>{
    res.status(200).json({message:"this is from server"});
})


app.listen(3000, ()=>console.log("server is listening at 3000"))