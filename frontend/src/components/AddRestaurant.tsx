import { useState } from 'react'
import { useAppData } from '../context/AppContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { restaurantService } from '../main';
import { BiMapPin, BiUpload } from 'react-icons/bi';

interface AddRestaurantProps{
    fetchMyRestaurant:()=>Promise<void>;
}

const AddRestaurant = ({ fetchMyRestaurant }: AddRestaurantProps) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { loadingLocation, location } = useAppData();

    const handleSubmit=async()=>{
        if(!name || !image || !location){
            alert("All fields are required");
            return;
        }

        const formData=new FormData();
        formData.append("name",name);
        formData.append("description",description);
        formData.append("phone",phone);
        formData.append("latitude",location.latitude.toString());
        formData.append("longitude",location.longitude.toString());
        formData.append("formattedAddress",location.formattedAddress);
        formData.append("image",image);

        try {
            setSubmitting(true);
            await axios.post(`${restaurantService}/api/restaurant`,formData,{
                headers:{
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            toast.success("Restaurant created successfully");
            fetchMyRestaurant();
        } catch (error:any) {
            toast.error(error.response?.data?.message || "Failed to create restaurant");
        } finally{
            setSubmitting(false);
        }
    }
  return (
    <div className='min-h-screen bg-gray-50 px-4 py-6'>
    <div className='mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5 '>
    <h1 className='text-xl font-semibold'>Add Your Restaurant</h1>    
    <input type="text" placeholder="Restaurant Name" value={name} onChange={(e) => setName(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
    <input type="number" placeholder='Contact number' value={phone} onChange={(e) => setPhone(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
    <textarea placeholder='Restaurant Description' value={description} onChange={(e) => setDescription(e.target.value)} className='w-full rounded-lg border px-4 py-2 text-sm outline-none ' />
    <input type="file" accept='image/*' onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} className='w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700 ' />
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
    <BiUpload className="h-5 w-5 text-red-500" />
    {image ? image.name : "Upload restaurant image"}
    <input type="file" accept='image/*' onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} className="hidden" />
</label>
   <div className='flex items-start gap-3 rounded-lg border p-4'>
    <BiMapPin className='mt-0.5 h-5 w-5 text-red-500' />
    <div className='text-sm '>
        {
            loadingLocation ? "Fetching location..." : location ? location.formattedAddress : "Failed to load location"
        }
    </div>
   </div>
    <button onClick={handleSubmit} disabled={submitting} className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400'>{submitting ? "Submitting..." : "Add Restaurant"}</button>
    </div>    
    </div>
  )
}

export default AddRestaurant