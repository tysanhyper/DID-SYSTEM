'use client';

import { useState } from 'react';

interface IpfsUploaderProps {
  onUploadSuccess: (ipfsHash: string) => void;
}

export default function IpfsUploader({ onUploadSuccess }: IpfsUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadedHash, setUploadedHash] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    // Create preview for images
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl('');
    }
  };

  const uploadToPinata = async (file: File) => {
    const JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

    if (!JWT) {
      throw new Error('Pinata JWT not configured. Check your .env.local file');
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedBy: 'did-system',
        timestamp: new Date().toISOString(),
      }
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    console.log('Uploading to Pinata...');

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${JWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Pinata error:', errorText);
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Pinata response:', data);

    return data.IpfsHash;
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const ipfsHash = await uploadToPinata(file);

      console.log('✅ Uploaded! IPFS Hash:', ipfsHash);

      // Verify the upload by trying to access it
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      console.log('Gateway URL:', gatewayUrl);

      setUploadedHash(ipfsHash);
      alert(`✅ File uploaded successfully!\n\nIPFS Hash: ${ipfsHash}\n\nView at: ${gatewayUrl}`);

      onUploadSuccess(ipfsHash);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`❌ Error uploading file:\n${error.message}\n\nCheck console for details (F12)`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-black/30 p-6 rounded-lg space-y-4 border border-purple-500/30">
      <h3 className="text-xl font-semibold">📤 Upload to IPFS</h3>
      <p className="text-sm text-gray-400">
        Upload your profile picture, resume, or any document to decentralized storage
      </p>

      <div className="space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx"
          className="w-full p-3 rounded-lg bg-black/30 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
        />

        {file && (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              📄 Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="border border-white/20 rounded-lg p-2">
                <p className="text-xs text-gray-400 mb-2">Preview:</p>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto rounded max-h-64 object-contain mx-auto"
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 py-3 rounded-lg font-semibold transition transform hover:scale-105"
        >
          {uploading ? '⏳ Uploading to IPFS...' : '🚀 Upload to IPFS'}
        </button>

        {/* Show uploaded hash with clickable link */}
        {uploadedHash && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
            <p className="text-green-400 font-semibold mb-2">✅ Uploaded Successfully!</p>
            <p className="text-xs text-gray-300 break-all mb-2">Hash: {uploadedHash}</p>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${uploadedHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              🔗 View on IPFS Gateway →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
