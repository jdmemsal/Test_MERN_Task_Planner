//we bring the config.json that has the connection for the mongo
require("dotenv").config();
const config = require("./config.json");

//we create a mongoose object and we pass the configuration of the mongo
const mongoose = require("mongoose");
mongoose.connect(config.connectionString);

//Objects following its data model
const User = require("./models/user.model");
const Note = require("./models/note.model");

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const {authenticateToken} = require("./utilities");

app.use(express.json());

app.use(
    cors({
        origin:"*",
    })
);


app.get("/", (req, res) => {
    res.json({data:"hello"});
});


//CREATE ACCOUNT:
app.post("/create-account", async(req, res) =>{

    const {fullName, email, password} = req.body;

    //if we lack of some data, we raise an error with status 400 
    if(!fullName){
        return res.status(400).json({error:true, message:"Full name is required"});
    }

    if(!email){
        return res.status(400).json({error:true, message:"Email is required"});
    }

    if(!password){
        return res.status(400).json({error:true, message:"Password is required"});
    }

    //we check if that email belongs already to a user
    const isUser = await User.findOne({email: email});

    if(isUser){
        return res.json({error:true, message:"That email is already in use"});
    }

    const user = new User({fullName, email, password});
    await user.save();

    const accessToken = jwt.sign({user}, process.env.ACCESS_TOKEN_SECRET, {expiresIn:"36000m",});

    return res.json({error: false, user, accessToken, message:"Registration Successful",});
});


//LOGIN:
app.post("/login", async (req, res) =>{
    
    //values from form
    const {email, password} = req.body;

    //evaluate data from form
    if(!email){
        return res.status(400).json({message: "Email is required"});
    }
    if(!password){
        return res.status(400).json({message: "Password is required"});
    }
    const userInfo = await User.findOne({email: email});
    if(!userInfo){
        return res.status(400).json({message: "User not found"});
    }

    //looking for user, succesful or invalid credentials
    if(userInfo.email == email && userInfo.password == password){
        const user = {user: userInfo};
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:"36000m",});

        return res.json({
            error:false,
            message:"Login Successful",
            email,
            accessToken,
        });
    }else{
        return res.status(400).json({error:true, message:"Invalid Credentials",});
    }
});


//GET USER
app.get("/get-user", authenticateToken, async(req,res) =>{

    const {user} = req.user;
    const isUser = await User.findOne({_id: user._id});

    if(!isUser){
        return res.sendStatus(401);
    }

    return res.json(
        {user: {
            fullName: isUser.fullName, 
            email: isUser.email,
            _id: isUser._id,
            createdOn: isUser.createdOn,
        }, message:"",}
    );
});


//CREATE NOTE:
app.post("/add-note", authenticateToken, async(req, res)=>{

    //We get the note from the front
    const {title, content, tags} = req.body;
    const {user} = req.user; //the user that is logged

    //we manage missing values
    if(!title){
        return res.status(400).json({error: true, message:"The title is required"});
    }
    if(!content){
        return res.status(400).json({error: true, message:"The content is required"});
    }

    //we try to create a new note object and save
    try{
        const note = new Note({title, content, tags: tags || [], userId: user._id,});

        await note.save();

        //if everything went well:
        return res.json({error:false, note, message:"Note created successfully",});
    }catch(error){
        //if something went wrong we catch the error
        return res.status(500).json({error:true, message:"Internal server error",});
    }
});


//EDIT NOTE:
app.put("/edit-note/:noteId", authenticateToken, async(req, res)=>{

    const noteId = req.params.noteId;
    const {title, content, tags, isPinned} = req.body;
    const {user} = req.user;

    if(!title && !content && !tags){
        return res.status(400).json({error: true, message:"No changes provided"});
    }

    try {
        const note = await Note.findOne({_id:noteId, userId:user._id});

        if(!note){
            return res.status(404).json({error:true, message:"Note not found"});
        }

        if(title) note.title = title;
        if(content) note.content = content;
        if(tags) note.tags = tags;
        if(isPinned) note.isPinned = isPinned;

        await note.save();

        return res.json({error:false, note, message:"Note updated successfully",});

    } catch (error) {
        return res.status(500).json({error:true, message:"Internal Server Error",});
    }
});


//GET ALL NOTES
app.get("/get-all-notes", authenticateToken, async(req, res)=>{
    
    const {user} = req.user;

    try {
        const notes = await Note.find({userId:user._id}).sort({isPinned:-1});

        return res.json({error:false, notes, message:"All notes retrieved successfully",});

    } catch (error) {
        return res.status(500).json({error:true, message:"Internal Server Error",});
    }
});


//DELETE A NOTE
app.delete("/delete-note/:noteId", authenticateToken, async(req, res)=>{

    const noteId = req.params.noteId;
    const {user} = req.user;

    try {
        const note = await Note.findOne({_id: noteId, userId: user._id});

        if(!note){
            return res.status(404).json({error: true, message:"Note not found"});
        }

        await Note.deleteOne({_id: noteId, userId: user._id});

        return res.json({error:false, message:"Note deleted successfully",});

    } catch (error) {
        return res.status(500).json({error:true, message:"Internal Server Error",});
    }
});


//UPDATE isPinned STATUS ON A NOTE
app.put("/update-note-pinned/:noteId", authenticateToken, async(req, res)=>{

    const noteId = req.params.noteId;
    const {isPinned} = req.body;
    const {user} = req.user;

    try {
        const note = await Note.findOne({_id:noteId, userId:user._id});

        if(!note){
            return res.status(404).json({error:true, message:"Note not found"});
        }

        //look for the value of the note that correspond to the id 
        //and change it for the value that comes from the req.body
        note.isPinned = isPinned;

        await note.save();

        return res.json({error:false, note, message:"Note updated successfully",});

    } catch (error) {
        return res.status(500).json({error:true, message:"Internal Server Error",});
    }
});


//Search notes
app.get("/search-notes", authenticateToken, async (req, res) =>{

    const {user} = req.user;
    const {query} = req.query;

    if(!query){
        return res.status(400).json({error: true, message: "Search query is required"});
    }

    try {
        const notesFound = await Note.find({userId: user._id, $or:[
            {title: {$regex: new RegExp(query, "i")}},
            {content: {$regex: new RegExp(query, "i")}},
        ],});

        return res.json({error:false, notes: notesFound, message:"Notes retrieved successfully",});
        
    } catch (error) {
        return res.status(500).json({error:true, message:"Internal Server Error"});
    }
});


app.listen(8000);

module.exports = app;