import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[#D0A242] via-[#C4963A] to-[#8B6914] bg-clip-text text-transparent">
              Fantasy Endurance
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-[#6B7280] mb-4">
            Fantasy Triathlon Picks
          </p>
          <p className="text-lg text-[#9CA3AF] mb-10 max-w-xl mx-auto">
            Pick your athletes, predict placements, earn points based on real race results. 
            Compete with friends in leagues across Ironman, T100, WTCS, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <Link to="/login" className="btn-secondary text-lg px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-4xl mb-3"><svg className="w-10 h-10 mx-auto text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
          <h3 className="text-lg font-semibold mb-2">Pick Athletes</h3>
<p className="text-[#9CA3AF] text-sm">Select athletes from the start list, predict their finishing positions, and earn points based on accuracy.</p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-3"><svg className="w-10 h-10 mx-auto text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg></div>
          <h3 className="text-lg font-semibold mb-2">Compete in Leagues</h3>
          <p className="text-[#9CA3AF] text-sm">Create or join leagues with custom scoring structures. Best scores across race series determine your rank.</p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-3"><svg className="w-10 h-10 mx-auto text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
          <h3 className="text-lg font-semibold mb-2">Track Leaderboards</h3>
          <p className="text-[#9CA3AF] text-sm">Global rankings, league standings, and athlete performance across the entire triathlon season.</p>
        </div>
      </div>
    </div>
  )
}
