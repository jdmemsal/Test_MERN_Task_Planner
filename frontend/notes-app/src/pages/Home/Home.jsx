import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar";
import NoteCard from "../../components/Cards/NoteCard";
import { MdAdd } from "react-icons/md";
import AddEditNotes from "./AddEditNotes";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

const Home = () => {

    const [openAddEditModal, setOpenAddEditModal] = useState({
        isShown: false,
        type:"add",
        data: null,
    });

    const [userInfo, setUserInfo] = useState(null);
    const [allNotes, setAllNotes] = useState([]);
    const [isSearch, setIsSearch] = useState(false);
    const navigate = useNavigate;

    //onEdit -> we pass the item(note)
    const handleEdit = (noteDetails) => {
        setOpenAddEditModal({isShown:true, data: noteDetails, type:"edit"});
    };


    //Get user info
    const getUserInfo = async () =>{
        try {
            const response = await axiosInstance.get("/get-user");
            if(response.data && response.data.user){
                setUserInfo(response.data.user);
            }
        } catch (error) {
            if(error.response.status ===401){
                localStorage.clear();
                navigate("/login");
            }
        }
    };


    //Get all notes
    const getAllNotes = async ()=>{
        try {
            const response = await axiosInstance.get("/get-all-notes");

            if(response.data && response.data.notes){
                setAllNotes(response.data.notes);
            }
        } catch (error) {
            console.log("An unexpected error occurred. Please try again");
        }
    };


    //Delete note
    const deleteNote = async (data) => {
        if (confirm(`This operation will delete the note: ${data.title}. Are you sure?`)) {

            try {
                const response = await axiosInstance.delete(`/delete-note/${data._id}`);
    
                if (response.data && !response.data.error){
                    alert("Note deleted successfully");
                    getAllNotes();
                }
            } catch (error) {
                if (error.response && error.response.data && error.response.data.message){
                    alert("Something went wrong. Please try again.");
                }
            }

        } 
    }


    //Pinned 
    const updatePinned = async (note) => {

        try {
            //we send the api call with the id AND the status of pinned as param
            const response = await axiosInstance.put(`/update-note-pinned/${note._id}`,
                {isPinned: !note.isPinned,}
            );

            if(response.data && response.data.notes){
                getAllNotes();
            }
        } catch (error) {
            
        }

    }


    //Search notes 
    const onSearchNote = async (query) => {
        try {
            const response = await axiosInstance.get("/search-notes", { params: {query}, });

            if(response.data && response.data.notes){
                setIsSearch(true);
                setAllNotes(response.data.notes);
            }
        } catch (error) {
            
        }
    }

    const handleClearSearch = () => {
        setIsSearch(false); 
        getAllNotes();
    };

    useEffect(() => {
        getUserInfo();
        getAllNotes();
        return () => {};
    }, []);

    return (
        <>
            <Navbar userInfo={userInfo} onSearchNote={onSearchNote} handleClearSearch={handleClearSearch}/>

            <div className="container mx-auto">
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {allNotes.map((item, index) => (
                        <NoteCard
                            key={item._id}
                            title={item.title}
                            date={item.createdOn}
                            content={item.content}
                            tags={item.tags}
                            isPinned={item.isPinned}
                            onEdit={()=>handleEdit(item)}
                            onDelete={()=>deleteNote(item)}
                            onPinNote={()=>updatePinned(item)}
                        />
                    ))}
                </div>
            </div>
            <button 
                className="w-16 h-16 flex items-center justify-center rounded-2xl bg-primary hover:bg-blue-600 absolute right-10 bottom-10" 
                onClick={()=>{
                    setOpenAddEditModal({isShown:true, type:"add", data:null});
                }}>
                <MdAdd className="text-[32px] text-white"/>
            </button>

            <Modal
                isOpen={openAddEditModal.isShown}
                onRequestClose={()=>{}}
                style={{
                    overlay:{
                        backgroundColor:"rgba(0,0,0,0.2",
                    },
                }}
                contentLabel=""
                className="w-[40%] max-h-3/4 bg-white rounded-md mx-auto mt-14 p-5 overflow-scroll">

                <AddEditNotes 
                    type = {openAddEditModal.type}
                    noteData={openAddEditModal.data}
                    onClose={()=>{setOpenAddEditModal({isShown:false, type:"add", data:null});}}

                    getAllNotes = {getAllNotes}
                />
            </Modal>
        </>
    )
}

export default Home