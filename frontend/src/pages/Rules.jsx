import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import PageMeta from '../components/PageMeta'

const SERIES_STYLES = {
  'T100': { background: 'rgba(236,72,153,0.12)', color: '#DB2777', backdropFilter: 'blur(8px)', border: '1px solid rgba(236,72,153,0.35)' },
  'Ironman Pro Series': { background: 'rgba(245,158,11,0.1)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'Ironman 70.3 Pro Series': { background: 'rgba(245,158,11,0.08)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'WTCS': { background: 'rgba(34,211,238,0.1)', color: '#0891B2', backdropFilter: 'blur(8px)' },
  'Ironman': { background: 'rgba(245,158,11,0.08)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'Ironman 70.3': { background: 'rgba(245,158,11,0.10)', color: '#B45309', backdropFilter: 'blur(8px)' },
  'Other': { background: 'rgba(139,92,246,0.1)', color: '#7C3AED', backdropFilter: 'blur(8px)', border: '1px solid rgba(139,92,246,0.25)' },
}

const SERIES_SOLID = {
  'T100': { background: '#6366F1' },
  'Ironman Pro Series': { background: '#F59E0B' },
  'Ironman 70.3 Pro Series': { background: '#F59E0B' },
  'Ironman': { background: '#A78BFA' },
  'Ironman 70.3': { background: '#A78BFA' },
  'WTCS': { background: '#22D3EE' },
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Card({ children, className = '' }) {
  return <div className={`bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] rounded-xl p-5 ${className}`}>{children}</div>
}

const TOC = [
  { id: 'how-to-play', label: 'How to Play' },
  { id: 'making-picks', label: 'Making Picks' },
  { id: 'scoring', label: 'Scoring Breakdown' },
  { id: 'fantasy-scoring', label: 'Fantasy Pick Scoring' },
  { id: 'side-bets', label: 'Side Bets' },
  { id: 'schedule', label: 'Race Schedule' },
  { id: 'private-races', label: 'Private Races' },
  { id: 'leagues', label: 'Leagues' },
  { id: 'best-of', label: 'Best-Of & Leaderboards' },
  { id: 'faq', label: 'FAQ' },
]

export default function Rules() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [openFaq, setOpenFaq] = useState(null)
  const [scheduleTab, setScheduleTab] = useState('All')
  

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageMeta title="Rules" description="Learn how Fantasy Endurance scoring and picks work" />
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 bg-gradient-to-r from-[#15A780] via-[#4CD9A5] to-[#4CD9A5] bg-clip-text text-transparent">
          How Fantasy Endurance Works
        </h1>
        <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto">
          Pick professional triathletes, earn points based on real race results, and compete against friends and the world.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {TOC.map(item => (
          <a key={item.id} href={`#${item.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[rgba(216,221,223,0.45)] border border-[rgba(180,190,200,0.3)] hover:border-[#D0A242]/40 hover:bg-[#E8E3DA]/60 transition-all text-sm text-[#9CA3AF] hover:text-[#1F2937] group">
            <span>{item.label}</span>
          </a>
        ))}
      </div>

      {/* ── HOW TO PLAY ── */}
      <Section id="how-to-play" title="How to Play">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-1">
          {[
            { step: 1, title: 'Create Account', desc: 'Sign up for free and set up your profile.' },
            { step: 2, title: 'Browse Races', desc: 'Check out upcoming races and start lists.' },
            { step: 3, title: 'Make Picks', desc: 'Predict top finishers and fastest splits.' },
            { step: 4, title: 'Submit', desc: 'Lock in picks before the race deadline.' },
            { step: 5, title: 'Watch & Score', desc: 'Points auto-calculated from race results.' },
            { step: 6, title: 'Leaderboard', desc: 'Climb the leaderboard as scores combine.' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mb-1.5 accent-tint" style={{ border: dark ? '2px solid rgba(21,167,128,0.35)' : '2px solid rgba(208,162,66,0.35)' }}>
                {item.step}
              </div>
              <h3 className="font-semibold text-[#D0A242] text-sm leading-tight">{item.title}</h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── MAKING PICKS ── */}
      <Section id="making-picks" title="Making Picks">
        <Card>
          <h3 className="font-semibold text-[#D0A242] mb-3">What You Pick Each Race</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[#E8E3DA]/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold accent-tint">1</span>
                <h4 className="font-medium text-[#1F2937]">Athlete Picks</h4>
              </div>
              <p className="text-sm text-[#9CA3AF]">Select athletes from the start list and predict their finishing position (1st, 2nd, 3rd, etc.). The closer your prediction, the higher your multiplier.</p>
            </div>
            <div className="bg-[#E8E3DA]/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold accent-tint">2</span>
                <h4 className="font-medium text-[#1F2937]">Fastest Splits</h4>
              </div>
              <p className="text-sm text-[#9CA3AF]">Predict who will post the fastest swim, bike, and run. 1st fastest = <span className="text-[#D0A242] font-semibold">5 pts</span>, 2nd = <span className="text-[#C4963A] font-semibold">3 pts</span>, 3rd = <span className="text-[#E11D48] font-semibold">1 pt</span> per split.</p>
            </div>
            <div className="bg-[#E8E3DA]/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold accent-tint">3</span>
                <h4 className="font-medium text-[#1F2937]">Side Bets</h4>
              </div>
              <p className="text-sm text-[#9CA3AF]">Answer optional bonus questions like "Will the winner break 8 hours?" or "Will a debutant podium?" Points vary by difficulty.</p>
            </div>
            <div className="bg-[#E8E3DA]/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold accent-tint">4</span>
                <h4 className="font-medium text-[#1F2937]">Underdog Pick <span className="text-xs text-[#9CA3AF] font-normal ml-1">optional</span></h4>
              </div>
              <p className="text-sm text-[#9CA3AF]">Tag any athlete as an <span className="text-[#D0A242] font-medium">underdog</span>. If they outperform (top half finish from bottom half of start list), your multiplier <span className="text-[#D0A242] font-semibold">doubles</span>. Bottom 25% finish = <span className="text-[#E11D48] font-semibold">halved</span>.</p>
            </div>
          </div>
        </Card>
      </Section>

      {/* ── SCORING BREAKDOWN ── */}
      <Section id="scoring" title="Scoring Breakdown">
        <p className="text-[#9CA3AF] text-sm mb-5">
          Each athlete earns a race score based on their performance. The total score is a weighted sum of placement and time, plus bonus points.
        </p>

        <Card className="mb-4">
          <h3 className="font-semibold text-[#D0A242] mb-3">Score Formula</h3>
          <div className="bg-[#ECF2F5]/60 rounded-lg p-4 font-mono text-sm text-center text-[#6B7280] mb-4">
            Score = (Placement × Weight) + (Time Bonus × Weight) + Split Bonus + Underdog Bonus + Record Bonus
          </div>

          <h4 className="font-medium text-[#6B7280] mb-2 text-sm">Series Weights</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#9CA3AF] border-b border-[rgba(180,190,200,0.3)]">
                  <th className="pb-2 pr-4">Series</th>
                  <th className="pb-2 pr-4 text-center">Placement Weight</th>
                  <th className="pb-2 text-center">Time Weight</th>
                </tr>
              </thead>
              <tbody className="text-[#6B7280]">
                {[
                  ['WTCS', '85%', '10%'],
                  ['T100', '85%', '15%'],
                  ['Ironman 70.3 / 70.3 Pro Series', '80%', '20%'],
                  ['Ironman / Ironman Pro Series', '75%', '25%'],
                  ['Challenge', '80%', '20%'],
                ].map(([series, p, t]) => (
                  <tr key={series} className="border-b border-[rgba(180,190,200,0.3)]">
                    <td className="py-2.5 pr-4 font-medium">{series}</td>
                    <td className="py-2.5 pr-4 text-center"><span className="text-[#22D3EE] font-semibold">{p}</span></td>
                    <td className="py-2.5 text-center"><span className="text-[#D0A242] font-semibold">{t}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="mb-4">
          <h3 className="font-semibold text-[#D0A242] mb-3">Placement Points</h3>
          <p className="text-xs text-[#9CA3AF] mb-3">Points awarded based on finishing position:</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-3">
            {[
              [1, 100], [2, 85], [3, 75], [4, 60], [5, 55],
              [6, 50], [7, 45], [8, 40], [9, 35], [10, 30],
            ].map(([place, pts]) => (
              <div key={place} className={`text-center p-2 rounded-lg ${place <= 3 ? 'bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/15' : 'bg-[#E8E3DA]/40'}`}>
                <div className={`text-xs font-bold ${place <= 3 ? 'text-[#D0A242]' : 'text-[#9CA3AF]'}`}>{place}{place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}</div>
                <div className="text-lg font-bold text-[#1F2937]">{pts}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="text-center p-2.5 rounded-lg bg-[#E8E3DA]/40">
              <div className="text-xs font-bold text-[#9CA3AF]">11th – 20th</div>
              <div className="text-lg font-bold text-[#1F2937]">25 → 11</div>
              <div className="text-xs text-[#9CA3AF]">decreasing by 1.5 per place</div>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-[#E8E3DA]/40">
              <div className="text-xs font-bold text-[#9CA3AF]">21st+</div>
              <div className="text-lg font-bold text-[#1F2937]">5</div>
              <div className="text-xs text-[#9CA3AF]">flat rate</div>
            </div>
          </div>
        </Card>

        <Card className="mb-4">
          <h3 className="font-semibold text-[#D0A242] mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Time Bonus (0–10 pts)
          </h3>
          <p className="text-xs text-[#9CA3AF] mb-2">Athletes earn bonus points based on how close their finish time is to the winner's time. The winner gets the full <span className="text-[#D0A242] font-semibold">10 pts</span>, and it scales down to <span className="text-[#D0A242] font-semibold">0</span> as the gap increases. The decay rate varies by series — shorter formats are stricter.</p>
        </Card>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <h3 className="font-semibold text-[#22D3EE] mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Split Bonus
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-3">Fastest in each discipline (swim, bike, run):</p>
            <div className="space-y-1.5">
              {[['1st fastest', 5, 'text-[#D0A242]'], ['2nd fastest', 3, 'text-[#67E8F9]'], ['3rd fastest', 1, 'text-[#B45309]']].map(([label, pts, color]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[#9CA3AF]">{label}</span>
                  <span className={`font-bold ${color}`}>+{pts}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">Per segment — max 15pts total (5+5+5 for fastest in all three)</p>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#D0A242] mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              Underdog Bonus
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-3">Outperform start rank vs. finish position:</p>
            <div className="space-y-1.5">
              {[['Gain 15+ spots', 7, 'text-[#D0A242]'], ['Gain 10+ spots', 3.5, 'text-[#D0A242]'], ['Gain 5+ spots', 1.5, 'text-[#C4963A]']].map(([label, pts, color]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[#9CA3AF]">{label}</span>
                  <span className={`font-bold ${color}`}>+{pts}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">Based on start rank minus actual finish position</p>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#67E8F9] mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              Record Bonus
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-3">Break a course record:</p>
            <div className="space-y-1.5">
              {[['Overall course record', 3, 'text-[#67E8F9]'], ['Split course record (swim/bike/run)', 1, 'text-[#67E8F9]']].map(([label, pts, color]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[#9CA3AF]">{label}</span>
                  <span className={`font-bold ${color}`}>+{pts}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF] mt-2">Max 6pts (3 overall + 1+1+1 splits)</p>
          </Card>
        </div>
      </Section>

      {/* ── FANTASY PICK SCORING ── */}
      <Section id="fantasy-scoring" title="Fantasy Pick Scoring">
        <Card className="mb-4">
          <p className="text-sm text-[#9CA3AF] mb-4">
            Your fantasy score for each pick combines the athlete's race score with how accurately you predicted their finish:
          </p>

          <div className="bg-[#ECF2F5]/60 rounded-lg p-4 font-mono text-sm text-center text-[#6B7280] mb-4">
            Fantasy Points = Athlete Score × Prediction Multiplier
          </div>

          <h3 className="font-semibold text-[#D0A242] mb-3">Prediction Accuracy Multipliers</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              ['Exact', '×1.5', 'bg-[rgba(208,162,66,0.08)] text-[#D0A242] border-[#D0A242]/20'],
              ['Off by 1', '×1.25', 'bg-[rgba(208,162,66,0.08)] text-[#D0A242] border-[#D0A242]/20'],
              ['Off by 2–3', '×1.1', 'bg-[rgba(208,162,66,0.08)] text-[#D0A242] border-[#D0A242]/15'],
              ['Off by 4–9', '×1.0', 'bg-[rgba(245,243,238,0.6)] text-[#6B7280] border-[rgba(180,190,200,0.3)]/30'],
              ['Off by 10+', '×0.75', 'bg-[rgba(251,113,133,0.1)] text-[#E11D48] border-[#BE123C]/20'],
            ].map(([label, mult, style]) => (
              <div key={label} className={`text-center p-3 rounded-lg border ${style}`}>
                <div className="text-xs mb-1">{label}</div>
                <div className="text-xl font-bold">{mult}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-[#D0A242] mb-3">Example</h3>
          <div className="bg-[rgba(245,243,238,0.6)] rounded-lg p-4 text-sm">
            <p className="text-[#6B7280] mb-2">You predict <span className="text-[#1F2937] font-medium">Kristian Blummenfelt</span> finishes <span className="text-[#D0A242] font-bold">2nd</span>. He finishes <span className="text-[#D0A242] font-bold">1st</span>.</p>
            <p className="text-[#9CA3AF] mb-1">His race score: <span className="text-[#1F2937]">100 placement + 10 time bonus + 5 fastest swim = 115 pts</span></p>
            <p className="text-[#9CA3AF] mb-1">You were off by 1 position → <span className="text-[#D0A242]">×1.25 multiplier</span></p>
            <p className="text-[#D0A242] font-bold mt-2">Your fantasy points: 115 × 1.25 = 143.75 pts</p>
          </div>
        </Card>
      </Section>

      {/* ── SIDE BETS ── */}
      <Section id="side-bets" title="Side Bets">
        <Card>
          <p className="text-sm text-[#9CA3AF] mb-4">
            Some races include optional side bet questions. Answer correctly for bonus points — the harder the question, the more you earn:
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {[
              ['Easy', '+1 pt', 'bg-[rgba(208,162,66,0.1)] border-[#D0A242]/25 text-[#C4963A]', '"Will the winner be from Europe?"'],
              ['Medium', '+3 pts', 'bg-[rgba(245,158,11,0.12)] border-[#D97706]/25 text-[#B45309]', '"Will the winner break 8 hours?"'],
              ['Hard', '+5 pts', 'bg-[rgba(251,113,133,0.12)] border-[#E11D48]/25 text-[#FDA4AF]', '"Will a first-time entrant finish top 5?"'],
            ].map(([diff, pts, style, example]) => (
              <div key={diff} className={`border rounded-xl p-4 ${style}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">{diff}</span>
                  <span className="text-xl font-extrabold">{pts}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] italic">e.g. {example}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#9CA3AF]">Side bets are added by race organizers. Not every race has them. They do not affect your athlete picks — they are separate bonus questions.</p>
        </Card>
      </Section>

      {/* ── RACE SCHEDULE ── (moved before leaderboards) */}
      <Section id="schedule" title="2026 Race Schedule">
        <Card>
          <p className="text-sm text-[#9CA3AF] mb-4">
            Races run throughout the season. Check the <Link to="/races" className="text-[#D0A242] hover:text-[#C4963A]">Races page</Link> for the latest schedule and start lists.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {['All', 'T100', 'WTCS', 'Ironman Pro Series', 'Ironman 70.3 Pro Series', 'Ironman', 'Ironman 70.3', 'Challenge'].map(tab => (
              <button
                key={tab}
                onClick={() => setScheduleTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scheduleTab === tab
                    ? ''
                    : 'text-[#9CA3AF] hover:text-[#1F2937] border border-transparent'
                }`}
                style={scheduleTab === tab ? (SERIES_STYLES[tab] || SERIES_STYLES['Other']) : { background: 'rgba(22,35,58,0.5)' }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {[
// const raceSchedule = [
  // --- 2026 Ironman Pro Series ---
  ['Mar 7', 'Ironman New Zealand', 'Ironman Pro Series', 'Taupo, New Zealand'],
  ['Mar 22', 'Ironman 70.3 Geelong', 'Ironman Pro Series', 'Geelong, Australia'],
  ['Mar 28', 'Ironman 70.3 Oceanside', 'Ironman Pro Series', 'Oceanside, CA'],
  ['Apr 18', 'Ironman Texas', 'Ironman Pro Series', 'The Woodlands, TX'],
  ['May 17', 'Ironman 70.3 Aix-en-Provence', 'Ironman Pro Series', 'Aix-en-Provence, France'],
  ['Jun 7', 'Ironman Hamburg', 'Ironman Pro Series', 'Hamburg, Germany'],
  ['Jun 14', 'Ironman 70.3 Happy Valley', 'Ironman Pro Series', 'State College, PA'],
  ['Jun 21', 'Ironman 70.3 Elsinore', 'Ironman Pro Series', 'Elsinore, Denmark'],
  ['Jun 28', 'Ironman Frankfurt', 'Ironman Pro Series', 'Frankfurt, Germany'],
  ['Jul 12', 'Ironman 70.3 Swansea', 'Ironman Pro Series', 'Swansea, Great Britain'],
  ['Jul 19', 'Ironman Lake Placid', 'Ironman Pro Series', 'Lake Placid, NY'],
  ['Jul 25', 'Ironman 70.3 Boise', 'Ironman Pro Series', 'Boise, ID'],
  ['Aug 15', 'Ironman Kalmar', 'Ironman Pro Series', 'Kalmar, Sweden'],
  ['Aug 30', 'Ironman 70.3 Zell am See-Kaprun', 'Ironman Pro Series', 'Zell am See, Austria'],
  ['Sep 12', 'Ironman 70.3 World Championship Nice', 'Ironman Pro Series', 'Nice, France'],
  ['Oct 10', 'Ironman World Championship Kona', 'Ironman Pro Series', 'Kailua-Kona, HI'],

  // --- 2026 T100 Series ---
  ['Mar 21', 'T100 Gold Coast', 'T100', 'Gold Coast, Australia'],
  ['Apr 25', 'T100 Singapore', 'T100', 'Singapore'],
  ['May 23', 'T100 Spain', 'T100', 'Spain'],
  ['Jun 6', 'T100 San Francisco', 'T100', 'San Francisco, USA'],
  ['Aug 15', 'T100 Vancouver', 'T100', 'Vancouver, Canada'],
  ['Sep 19', 'T100 French Riviera', 'T100', 'Frejus, France'],
  ['Nov 14', 'T100 Dubai', 'T100', 'Dubai, UAE'],
  ['Dec 11', 'T100 Qatar Grand Final', 'T100', 'Doha, Qatar'],

  // --- 2026 WTCS ---
  ['Mar 27', 'WTCS Abu Dhabi', 'WTCS', 'Abu Dhabi, UAE'],
  ['Apr 25', 'WTCS Samarkand', 'WTCS', 'Samarkand, Uzbekistan'],
  ['May 16', 'WTCS Yokohama', 'WTCS', 'Yokohama, Japan'],
  ['May 30', 'WTCS Alghero', 'WTCS', 'Alghero, Italy'],
  ['Jun 20', 'WTCS Quiberon', 'WTCS', 'Quiberon, France'],
  ['Jul 11', 'WTCS Hamburg', 'WTCS', 'Hamburg, Germany'],
  ['Jul 25', 'WTCS London', 'WTCS', 'London, Great Britain'],
  ['Aug 29', 'WTCS Weihai', 'WTCS', 'Weihai, China'],
  ['Sep 13', 'WTCS Karlovy Vary', 'WTCS', 'Karlovy Vary, Czechia'],
  ['Sep 25', 'WTCS Pontevedra', 'WTCS', 'Pontevedra, Spain'],


            ].filter(([, , series]) => scheduleTab === 'All' || series === scheduleTab)
             .map(([date, name, series, location]) => (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(245,243,238,0.6)]">
                <div className="w-16 flex-shrink-0 text-sm font-medium text-[#6B7280]">{date}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1F2937] truncate">{name}</div>
                  <div className="text-xs text-[#9CA3AF]">{location}</div>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded font-medium flex-shrink-0" style={SERIES_STYLES[series] || SERIES_STYLES['Other']}>{series}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ── PRIVATE RACES ── */}
      <Section id="private-races" title="Private Races">
        <p className="text-sm text-[#9CA3AF] mb-4">
          Private races let you create your own race with a custom start list — perfect for competing with friends at local or amateur events. Only invited users can see the race, picks, and results.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(208,162,66,0.08)] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <h3 className="font-semibold text-[#D0A242]">Create</h3>
            </div>
            <ol className="space-y-2 text-sm text-[#9CA3AF] list-none">
              <li className="flex gap-2"><span className="text-[#D0A242] font-medium shrink-0">1.</span><span>Go to <Link to="/races" className="text-[#D0A242] hover:text-[#C4963A]">Races</Link> and tap <span className="text-[#D0A242] font-medium">+ Create Private Race</span></span></li>
              <li className="flex gap-2"><span className="text-[#D0A242] font-medium shrink-0">2.</span><span>Enter race name, location, and date</span></li>
              <li className="flex gap-2"><span className="text-[#D0A242] font-medium shrink-0">3.</span><span>Add each athlete by name</span></li>
              <li className="flex gap-2"><span className="text-[#D0A242] font-medium shrink-0">4.</span><span>Optionally add side bets</span></li>
              <li className="flex gap-2"><span className="text-[#D0A242] font-medium shrink-0">5.</span><span>Invite friends via email or share the code</span></li>
            </ol>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(208,162,66,0.08)] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#22D3EE]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </div>
              <h3 className="font-semibold text-[#D0A242]">Join</h3>
            </div>
            <ul className="space-y-1.5 text-sm text-[#9CA3AF] list-none">
              <li>Join via invite code from Races page</li>
              <li>Only visible to the creator and invited members</li>
              <li>Shows a <span className="text-xs px-1.5 py-0.5 rounded-full border border-[#D0A242]/20 bg-[rgba(208,162,66,0.08)] text-[#D0A242] font-medium">Private</span> badge</li>
              <li>Any logged-in user can create one</li>
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(208,162,66,0.08)] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#D0A242]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-semibold text-[#D0A242]">Enter Results</h3>
            </div>
            <ul className="space-y-1.5 text-sm text-[#9CA3AF] list-none">
              <li>Only the race creator can enter results</li>
              <li>Set finishing order and optional split times</li>
              <li>Resolve any side bets</li>
              <li>Scoring is calculated automatically</li>
            </ul>
          </Card>
        </div>
      </Section>

      {/* ── LEAGUES ── */}
      <Section id="leagues" title="Leagues">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-[#D0A242] mb-2">Creating a League</h3>
            <ul className="space-y-2 text-sm text-[#9CA3AF]">
              <li className="flex gap-2"><span className="text-[#22D3EE]">•</span> Give your league a name</li>
              <li className="flex gap-2"><span className="text-[#22D3EE]">•</span> Choose public (anyone joins) or private (invite only)</li>
              <li className="flex gap-2"><span className="text-[#22D3EE]">•</span> Set an optional password for private leagues</li>
              <li className="flex gap-2"><span className="text-[#22D3EE]">•</span> Customize scoring structure (races per series)</li>
              <li className="flex gap-2"><span className="text-[#22D3EE]">•</span> Share the invite link with friends</li>
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold text-[#D0A242] mb-2">League Features</h3>
            <ul className="space-y-2 text-sm text-[#9CA3AF]">
              <li className="flex gap-2"><span className="text-[#D0A242]">•</span> Custom scoring — admins set how many races count per series</li>
              <li className="flex gap-2"><span className="text-[#D0A242]">•</span> Season selector — view current year or all-time standings</li>
              <li className="flex gap-2"><span className="text-[#D0A242]">•</span> Race composition visual — see exactly which races factor in</li>
              <li className="flex gap-2"><span className="text-[#D0A242]">•</span> Star/favorite leagues to pin them on your dashboard</li>
              <li className="flex gap-2"><span className="text-[#D0A242]">•</span> Admin controls — transfer ownership, delete league</li>
            </ul>
          </Card>
        </div>
      </Section>

      {/* ── BEST-OF & LEADERBOARDS ── */}
      <Section id="best-of" title="Best-Of & Leaderboards">
        <Card className="mb-4">
          <p className="text-sm text-[#9CA3AF] mb-4">
            Season standings use a <span className="text-[#D0A242] font-semibold">best-of</span> system. Only your top scores from each race series count toward your total. This rewards consistency and allows you to recover from bad races.
          </p>

          <h3 className="font-semibold text-[#D0A242] mb-3">Global Leaderboard Structure</h3>
          <p className="text-xs text-[#9CA3AF] mb-3">Your season total is the sum of your best scores across these series:</p>

          <div className="space-y-2 mb-4">
            {[
              ['T100', 3, 'Top professional short-course league'],
              ['Ironman Pro Series', 3, 'Full Ironman pro circuit'],
              ['Ironman 70.3 Pro Series', 3, 'Half Ironman pro circuit'],
              ['WTCS', 1, 'World Triathlon Championship Series'],
            ].map(([series, count, desc]) => (
              <div key={series} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(245,243,238,0.6)]">
                <div className="w-2 h-8 rounded-full" style={SERIES_SOLID[series] || { background: '#94A3B8' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded font-medium" style={SERIES_STYLES[series] || SERIES_STYLES['Other']}>{series}</span>
                    <span className="text-xs text-[#9CA3AF]">{desc}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[#D0A242]">{count}</span>
                  <span className="text-xs text-[#9CA3AF] ml-1">best</span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(245,243,238,0.6)] border border-[rgba(180,190,200,0.3)]/30">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-[#15A780] via-[#4CD9A5] to-[#4CD9A5]" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-[rgba(245,243,238,0.6)] text-[#6B7280] border-[rgba(180,190,200,0.3)]">Other</span>
                  <span className="text-xs text-[#9CA3AF]">Non-pro-series Ironman, Ironman 70.3, and Challenge races</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-[#D0A242]">2</span>
                <span className="text-xs text-[#9CA3AF] ml-1">best</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF] mb-4">Your highest scores from each category will be counted — others are still visible but greyed out.</p>

          <div className="bg-[#ECF2F5]/60 rounded-lg p-4 text-sm text-[#9CA3AF]">
            <p className="mb-2"><span className="text-[#1F2937] font-medium">Example:</span> You race in 5 T100 events and score 120, 95, 110, 80, 130. Only your best 3 count:</p>
            <div className="flex gap-2 flex-wrap">
              {[130, 120, 110, 95, 80].map((pts, i) => (
                <span key={i} className={`px-3 py-1 rounded-lg text-sm font-mono ${i < 3 ? 'bg-[rgba(208,162,66,0.08)] text-[#D0A242] border border-[#D0A242]/15' : 'bg-[rgba(245,243,238,0.6)] text-[#9CA3AF] line-through'}`}>
                  {pts}
                </span>
              ))}
              <span className="text-[#D0A242] font-bold ml-2">= 360 pts from T100</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-[#D0A242] mb-2">How It Looks in the App</h3>
          <div className="space-y-2 text-sm text-[#9CA3AF]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[#D0A242]/30 border border-[#D0A242]/20" />
              <span><span className="text-[#D0A242]">Qualifying races</span> — highlighted and count toward your total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[rgba(245,243,238,0.6)] border border-[rgba(180,190,200,0.3)]/40" />
              <span><span className="text-[#9CA3AF]">Non-qualifying races</span> — visible but grayed out at the bottom, do not count</span>
            </div>
          </div>
        </Card>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq" title="FAQ">
        <div className="space-y-2">
          {[
            ['Can I change my picks after submitting?', 'Yes, you can update your picks any time before the race locks. Once locked, picks are final.'],
            ['What happens if my athlete DNFs (Did Not Finish)?', 'Athletes who DNF receive 0 placement points and do not earn any split bonuses, even for completed segments.'],
            ['Can I save a draft and finish later?', 'Yes! Save your picks as a draft and come back to edit them before the lock time.'],
            ['How are ties broken in the leaderboard?', 'If two users have the same total points, the user with more qualifying races is ranked higher. If still tied, total fantasy score across all races is used.'],
            ['Can I be in multiple leagues?', 'Yes, there is no limit on the number of leagues you can join. Each league can have its own scoring structure.'],
            ['When are race results scored?', 'Scores are calculated automatically once official results are published — typically within 24 hours after the race finishes.'],
            ['Do I need to pick every race?', 'No. Pick as many or as few races as you want. Only your best scores count, so quality matters more than quantity.'],
          ].map(([q, a], i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left"
            >
              <div className={`p-4 rounded-lg border transition-colors ${openFaq === i ? (dark ? 'bg-[#1A2233] border-[#D0A242]/20' : 'bg-[rgba(216,221,223,0.45)] border-[#D0A242]/20') : (dark ?'bg-[#0E1421] border-[#1E293B] hover:border-[#334155]': 'bg-[rgba(216,221,223,0.45)]/40 border-[rgba(180,190,200,0.3)] hover:border-[rgba(180,190,200,0.3)]')}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm ${dark ? 'text-[#1F2937]' : 'text-[#1F2937]'}">{q}</span>
                  <svg className={`w-4 h-4 text-[#9CA3AF] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {openFaq === i && (
                  <p className="text-sm text-[#9CA3AF] mt-2 leading-relaxed">{a}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-3">Ready to Play?</h2>
        <p className="text-[#9CA3AF] mb-5">Check out upcoming races and start making your picks!</p>
        <div className="flex justify-center gap-3">
          <Link to="/races" className="btn-primary px-6 py-2.5">Browse Races</Link>
          <Link to="/leaderboard" className="px-6 py-2.5 rounded-lg bg-[#E8E3DA] hover:bg-[#E8E3DA] text-[#6B7280] transition-colors">View Leaderboard</Link>
        </div>
      </div>
    </div>
  )
}
