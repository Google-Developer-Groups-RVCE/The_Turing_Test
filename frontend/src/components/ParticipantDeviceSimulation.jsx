import React from 'react';

export default function ParticipantDeviceSimulation() {
  return (
    <div className="w-full h-[620px] rounded-3xl bg-dark-950 border-[6px] border-dark-700 shadow-2xl overflow-hidden relative flex flex-col">
      <iframe
        key="participant-sim-iframe"
        src="/simulation/round?isSimulation=true"
        title="Participant Device Live Screen"
        className="w-full h-full border-0 bg-[#0a111a]"
      />
    </div>
  );
}
