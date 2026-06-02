import React, { useEffect, useState } from "react";
import axios from "axios";
import { riderService } from "../config";
import toast from "react-hot-toast";
import { BiUpload } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import { FiCreditCard, FiPhone, FiUser } from "react-icons/fi";
import { getErrorMessage } from "../utils/http";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentName: string;
  currentPhone: string;
  currentAadharNumber: string;
  currentDrivingLicenseNumber: string;
}

const RiderEditProfile = ({
  isOpen,
  onClose,
  onSuccess,
  currentName,
  currentPhone,
  currentAadharNumber,
  currentDrivingLicenseNumber,
}: Props) => {
  const { fetchUser } = useAppData();
  const [name, setName] = useState(currentName);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone);
  const [aadharNumber, setAadharNumber] = useState(currentAadharNumber);
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState(currentDrivingLicenseNumber);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(currentName);
    setPhoneNumber(currentPhone);
    setAadharNumber(currentAadharNumber);
    setDrivingLicenseNumber(currentDrivingLicenseNumber);
    setImage(null);
  }, [isOpen, currentName, currentPhone, currentAadharNumber, currentDrivingLicenseNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    if (name !== currentName) formData.append("name", name);
    if (phoneNumber !== currentPhone) formData.append("phoneNumber", phoneNumber);
    if (aadharNumber !== currentAadharNumber) formData.append("aadharNumber", aadharNumber);
    if (drivingLicenseNumber !== currentDrivingLicenseNumber) {
      formData.append("drivingLicenseNumber", drivingLicenseNumber);
    }
    if (image) formData.append("file", image);

    try {
      await axios.put(`${riderService}/api/rider/profile/update`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Profile updated successfully!");
      if (name !== currentName) await fetchUser(); // Update global auth context
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update profile"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit rider profile"
      description="Update your rider identity details without leaving the dashboard."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          icon={<FiUser size={16} />}
        />
        <Input
          label="Phone Number"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          icon={<FiPhone size={16} />}
        />
        <Input
          label="Aadhaar Number"
          type="text"
          value={aadharNumber}
          onChange={(e) => setAadharNumber(e.target.value)}
          required
          icon={<FiCreditCard size={16} />}
        />
        <Input
          label="Driving Licence Number"
          type="text"
          value={drivingLicenseNumber}
          onChange={(e) => setDrivingLicenseNumber(e.target.value)}
          required
          icon={<FiCreditCard size={16} />}
        />
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 transition hover:border-[var(--color-accent)]/40 hover:bg-white/4">
          <BiUpload className="h-6 w-6 text-[var(--color-accent)]" />
          <span className="text-sm text-gray-300">
            {image ? image.name : "Upload a refreshed rider profile picture"}
          </span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>
        <Button type="submit" disabled={loading} fullWidth>
          {loading ? "Saving Changes..." : "Save Profile"}
        </Button>
      </form>
    </Modal>
  );
};

export default RiderEditProfile;

