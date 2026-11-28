import React, { useState } from 'react';
import { Attendance } from './pages/Attendance';
import { Layout } from './components/Layout';
import { User } from './types';

const App: React.FC = () => {
  // Hardcode user untuk konteks Layout (karena tidak ada login)
  const [user] = useState<User>({
    nama: "HR Manager",
    email: "hr@flowsalon.com",
    jabatan: "Human Resources"
  });

  // State untuk rincian absen agar bisa menyembunyikan header Layout
  const [selectedStat, setSelectedStat] = useState<any>(null);
  const [isSalaryDetailOpen, setIsSalaryDetailOpen] = useState(false);

  // Background image
  const [bgUrl] = useState('https://i.pinimg.com/1200x/12/17/11/1217112960bc6c8070c6709369c8ce86.jpg');

  return (
    <div className="min-h-screen bg-transparent">
      <div 
        className="fixed-bg"
        style={{ backgroundImage: `url(${bgUrl})` }}
      >
        <div className="absolute inset-0 bg-black/15" />
      </div>
      
      <div className="relative z-10 min-h-screen bg-transparent">
          <Layout user={user} hideHeader={!!selectedStat || isSalaryDetailOpen}>
            <div className="animate-in fade-in duration-700 bg-transparent w-full">
              <Attendance 
                externalSelectedStat={selectedStat} 
                onExternalSelect={setSelectedStat} 
                onSalaryDetailToggle={setIsSalaryDetailOpen}
              />
            </div>
          </Layout>
      </div>
    </div>
  );
};

export default App;