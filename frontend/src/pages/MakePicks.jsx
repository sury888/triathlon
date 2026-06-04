import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import PageMeta from '../components/PageMeta'

const DIFFICULTY_COLORS = {
easy: 'bg-[rgba(208,162,66,0.08)] text-[#C4963A] border-[#D0A242]/20',
medium: 'bg-[rgba(245,158,11,0.1)] text-[#C4963A] border-[#D0A242]/20',
hard: 'bg-[rgba(251,113,133,0.1)] text-[#E11D48] border-[#E11D48]/20',
}

const DIFFICULTY_POINTS = { easy: 1, medium: 3, hard: 5 }

function ValidationModal({ errors, onClose }) {
if (!errors || errors.length === 0) return null
return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
<div className="modal-panel w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
<div className="flex items-center gap-3 mb-4">
<span className="text-3xl">&#9888;</span>
<h2 className="text-xl font-bold text-[#E11D48]">Cannot Submit Picks</h2>
</div>
<ul className="space-y-2 mb-6">
{errors.map((err, i) => (
<li key={i} className="flex items-start gap-2 text-sm text-[#6B7280]">
<span className="text-[#E11D48] mt-0.5">&#8226;</span>
<span>{err}</span>
</li>
))}
</ul>
<button onClick={onClose} className="btn-primary w-full">Got it</button>
</div>
</div>
)
}

function UnsavedModal({ onStay, onLeave }) {
return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
<div className="modal-panel w-full max-w-md mx-4 p-6">
<div className="flex items-center gap-3 mb-4">
<span className="text-3xl">&#9888;</span>
<h2 className="text-xl font-bold text-[#D0A242]">Unsaved Picks</h2>
</div>
<p className="text-[#6B7280] text-sm mb-6">
You have unsaved or incomplete picks. If you leave now, your changes may be lost.
</p>
<div className="flex gap-3">
<button onClick={onStay} className="btn-primary flex-1">Stay &amp; Finish</button>
<button onClick={onLeave} className="flex-1 px-4 py-2 rounded-lg bg-[#E8E3DA] text-[#6B7280] hover:bg-[#E8E3DA] transition-colors">Leave Anyway</button>
</div>
</div>
</div>
)
}

function AthleteCard({ entry, index, isPicked, isPickedForPlace, placedPosition, onClick, disabled, activeSlotType, gender, isSelected, isWTCS, isPrivate }) {
const name = entry.athleteName || entry.athlete?.name || 'Unknown'
const rank = entry.startRank || index + 1
const isSplitSlot = activeSlotType && !activeSlotType.startsWith('#')
const blocked = disabled
const handleDragStart = (e) => {
e.dataTransfer.setData('application/json', JSON.stringify({ ...entry, _dragGender: gender }))
e.dataTransfer.effectAllowed = 'move'
}
return (
<div
draggable={!blocked}
onDragStart={handleDragStart}
onClick={() => !blocked && onClick()}
className={`flex items-center gap-2 p-2.5 rounded-lg text-sm transition-all select-none ${
isSelected
? 'bg-[rgba(208,162,66,0.08)] border-2 border-[#D0A242]/30 cursor-pointer ring-1 ring-[#15A780]/20'
: blocked
? 'opacity-40 cursor-not-allowed bg-[rgba(216,221,223,0.45)]'
: activeSlotType
? 'bg-[rgba(208,162,66,0.08)] hover:bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/20 cursor-pointer'
: 'bg-[rgba(245,243,238,0.6)] hover:bg-[#E8E3DA] cursor-pointer'
}`}
>
<span className="text-sm text-[#9CA3AF] w-5 text-right font-mono flex-shrink-0">{rank}</span>
<div className="flex-1 min-w-0">
<div className="font-medium truncate text-sm">{name}</div>
{isPrivate ? null : isWTCS ? (
<div className="flex gap-1.5 mt-0.5 flex-wrap">
{entry.athlete?.wtsRanking && <span className="text-xs text-[#A5B4FC]">WTCS Rank: {entry.athlete?.wtsRanking}</span>}
{entry.athlete?.winPct && entry.athlete?.winPct !== '0' && entry.athlete?.winPct !== '0.0' && (
<span className="text-xs text-[#B45309]">WTCS Win: {entry.athlete?.winPct}%</span>
)}
{entry.athlete?.podiumPct && entry.athlete?.podiumPct !== '0' && entry.athlete?.podiumPct !== '0.0' && (
<span className="text-xs text-[#B45309]">WTCS Podium: {entry.athlete?.podiumPct}%</span>
)}
</div>
) : (
<div className="flex gap-1.5 mt-0.5 flex-wrap">
{entry.athlete?.ptoRanking && <span className="text-xs text-[#B45309]">PTO: {entry.athlete?.ptoRanking}</span>}
<span className="text-xs text-[#22D3EE]">Swim: {entry.athlete?.swimRanking || '-'}</span>
<span className="text-xs text-[#D0A242]">Bike: {entry.athlete?.bikeRanking || '-'}</span>
<span className="text-xs text-[#E11D48]">Run: {entry.athlete?.runRanking || '-'}</span>
</div>
)}
</div>
{isPickedForPlace && <span className="text-sm text-[#9CA3AF] flex-shrink-0">{placedPosition ? ['1st','2nd','3rd','4th','5th'][placedPosition - 1] : 'placed'}</span>}
{isSelected && <span className="text-sm text-[#D0A242] font-bold flex-shrink-0">selected</span>}
{!blocked && !isSelected && activeSlotType && (
<span className="text-sm text-[#22D3EE] animate-pulse flex-shrink-0">+ {activeSlotType}</span>
)}
</div>
)
}

function PlacementSlot({ place, athlete, isUnderdog, onRemove, onToggleUnderdog, isActive, onClick, gender, fieldSize, underdogError, onDrop }) {
const ordinals = ['1st', '2nd', '3rd', '4th', '5th']
const [dragOver, setDragOver] = useState(false)
const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true) }
const handleDragLeave = () => setDragOver(false)
const handleDrop = (e) => { e.preventDefault(); setDragOver(false); try { const d = JSON.parse(e.dataTransfer.getData('application/json')); if (d._dragGender === gender) onDrop(d) } catch {} }
return (
<div
onClick={onClick}
onDragOver={handleDragOver}
onDragLeave={handleDragLeave}
onDrop={handleDrop}
className={`relative p-3 rounded-lg border-2 border-dashed transition-all min-h-[52px] ${dragOver ? 'border-[#D0A242] bg-[rgba(208,162,66,0.08)]' : ''} ${
athlete
? isActive
? isUnderdog
? 'border-[#D0A242]/40 bg-[rgba(208,162,66,0.08)] cursor-pointer ring-1 ring-[#15A780]/20'
: 'border-[#D0A242]/30 bg-[rgba(245,243,238,0.6)] cursor-pointer ring-1 ring-[#15A780]/20'
: isUnderdog
? 'border-[#D0A242]/40 bg-[rgba(208,162,66,0.08)]'
: 'border-[rgba(180,190,200,0.3)] bg-[rgba(245,243,238,0.6)]'
: isActive
? 'border-[#D0A242] bg-[rgba(208,162,66,0.08)] cursor-pointer'
: 'border-[rgba(180,190,200,0.3)] bg-[rgba(216,221,223,0.45)] cursor-pointer hover:border-[#D0A242]/20'
}`}
>
<div className="flex items-center justify-between">
<span className={`text-sm font-bold ${gender === 'M' ? 'text-[#22D3EE]' : 'text-[#E11D48]'}`}>
{ordinals[place - 1]}
</span>
{athlete && (
<div className="flex items-center gap-1">
<button
onClick={(e) => { e.stopPropagation(); onToggleUnderdog() }}
className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
isUnderdog ? 'bg-[#D0A242] text-[#FAFAFA] font-bold' : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]'
}`}
>
{isUnderdog ? 'Underdog' : 'Underdog'}
</button>
<button onClick={(e) => { e.stopPropagation(); onRemove() }} className="text-[#E11D48] hover:text-[#E11D48] text-xs ml-0.5">&times;</button>
</div>
)}
</div>
{athlete ? (
<div className="mt-0.5">
<span className="text-sm font-medium">{athlete.athleteName || athlete.name}</span>
<span className="text-sm text-[#9CA3AF] ml-1">#{athlete.startRank}</span>
</div>
) : (
<p className="text-sm text-[#9CA3AF] mt-0.5">
{isActive ? 'Click an athlete' : 'Click to select'}
</p>
)}
{underdogError && (
<p className="text-xs text-[#D0A242] mt-0.5">{underdogError}</p>
)}
</div>
)
}

function SplitSlot({ label, color, selectedAthlete, isActive, onClick, onRemove, onDrop, gender }) {
const [dragOver, setDragOver] = useState(false)
const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true) }
const handleDragLeave = () => setDragOver(false)
const handleDrop = (e) => { e.preventDefault(); setDragOver(false); try { const d = JSON.parse(e.dataTransfer.getData('application/json')); if (d._dragGender === gender) onDrop(d) } catch {} }
return (
<div
onClick={onClick}
onDragOver={handleDragOver}
onDragLeave={handleDragLeave}
onDrop={handleDrop}
className={`p-3 rounded-lg border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'border-[#D0A242] bg-[rgba(208,162,66,0.08)]' : ''} ${
selectedAthlete
? isActive
? 'border-[rgba(180,190,200,0.3)] bg-[rgba(245,243,238,0.6)] ring-1 ring-[#15A780]/20'
: 'border-[rgba(180,190,200,0.3)] bg-[rgba(245,243,238,0.6)]'
: isActive
? 'border-[#D0A242] bg-[rgba(208,162,66,0.08)]'
: 'border-[rgba(180,190,200,0.3)] bg-[rgba(216,221,223,0.45)] hover:border-[#D0A242]/20'
}`}
>
<div className="flex items-center justify-between">
<div className="flex items-center gap-1">
<span className={`text-sm font-bold ${color}`}>{label}</span>
</div>
{selectedAthlete && (
<button onClick={(e) => { e.stopPropagation(); onRemove() }} className="text-[#E11D48] hover:text-[#E11D48] text-xs">&times;</button>
)}
</div>
{selectedAthlete ? (
<p className="text-sm font-medium mt-0.5 truncate">{selectedAthlete.athleteName || selectedAthlete.name}</p>
) : (
<p className="text-sm text-[#9CA3AF] mt-0.5">{isActive ? 'Click an athlete' : 'Click to select'}</p>
)}
</div>
)
}

export default function MakePicks() {
const { id } = useParams()
const { user } = useAuth()
const navigate = useNavigate()
const location = useLocation()
const inviteCode = location.state?.inviteCode
const [inviteCopied, setInviteCopied] = useState(false)

const [race, setRace] = useState(null)
const [siblingRace, setSiblingRace] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
const [success, setSuccess] = useState('')

const [genderState, setGenderState] = useState({})
const [activeSlot, setActiveSlot] = useState(null)
const [selectedAthlete, setSelectedAthlete] = useState(null) // { entry, gender } — athlete-first pick mode
const [searchM, setSearchM] = useState('')
const [searchF, setSearchF] = useState('')
const [validationErrors, setValidationErrors] = useState(null)
const [underdogErrors, setUnderdogErrors] = useState({})

const [saveStatus, setSaveStatus] = useState('')
const autoSaveTimer = useRef(null)
const isInitialLoad = useRef(true)
const isDirty = useRef(false)
const [showLeaveWarning, setShowLeaveWarning] = useState(false)

const [rulesExpanded, setRulesExpanded] = useState(false)
const [lockCountdown, setLockCountdown] = useState('')
const [mobileGenderTab, setMobileGenderTab] = useState('M')
const mobilePicksRef = useRef(null)
const mobileFieldRef = useRef(null)

const scrollToMobileField = () => {
if (window.innerWidth < 1024 && mobileFieldRef.current) {
setTimeout(() => mobileFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
}
}
const scrollToMobilePicks = () => {
if (window.innerWidth < 1024 && mobilePicksRef.current) {
setTimeout(() => mobilePicksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
}
}

useEffect(() => {
if (!race) return
function update() {
const diff = new Date(race.lockTime) - new Date()
if (diff <= 0) { setLockCountdown('Closed'); return }
const d = Math.floor(diff / 86400000)
const h = Math.floor((diff % 86400000) / 3600000)
const m = Math.floor((diff % 3600000) / 60000)
if (d > 0) setLockCountdown(`${d}d ${h}h until lock`)
else if (h > 0) setLockCountdown(`${h}h ${m}m until lock`)
else setLockCountdown(`${m}m until lock`)
}
update()
const id = setInterval(update, 30000)
return () => clearInterval(id)
}, [race])

// Combined side bets state (shared across genders)
const [sideBets, setSideBets] = useState({})

const handleBack = () => {
if (isDirty.current) {
setShowLeaveWarning(true)
} else {
navigate(-1)
}
}

const initGenderState = useCallback((gender) => {
return {
slots: [null, null, null, null, null],
underdogIndex: -1,
splits: { swim: null, bike: null, run: null },
globalOptIn: true,
}
}, [])

useEffect(() => {
async function fetchRace() {
try {
const { data } = await api.get(`/races/${id}`)
setRace(data)

const state = { [data.gender]: initGenderState(data.gender) }

let sibData = null
if (data.eventSiblings && data.eventSiblings.length > 0) {
const sibId = data.eventSiblings[0]._id
const sibRes = await api.get(`/races/${sibId}`)
sibData = sibRes.data
setSiblingRace(sibData)
state[sibData.gender] = initGenderState(sibData.gender)
}

// Initialize combined side bets from whichever race has config
const sbConfig = data.sideBetsConfig || sibData?.sideBetsConfig || []
const sbInit = {}
sbConfig.forEach(bet => { sbInit[bet.key] = '' })
setSideBets(sbInit)

// Load existing picks
try {
const picksRes = await api.get(`/picks/user/${user._id}`)
const loadPicks = (raceData, gender) => {
const existing = picksRes.data.find(p => (p.race?._id || p.race) === raceData._id)
if (!existing) return
const gs = state[gender]
if (existing.picks && existing.picks.length > 0) {
existing.picks.forEach(p => {
const athleteId = p.athlete?._id || p.athlete
const entry = raceData.startList.find(e => (e.athlete?._id || e.athlete) === athleteId)
if (entry && p.predictedPlace >= 1 && p.predictedPlace <= 5) {
gs.slots[p.predictedPlace - 1] = entry
if (p.isUnderdog) gs.underdogIndex = p.predictedPlace - 1
}
})
}
if (existing.fastestSplits) {
for (const split of ['swim', 'bike', 'run']) {
const aId = existing.fastestSplits[split]
if (aId) {
const entry = raceData.startList.find(e => (e.athlete?._id || e.athlete) === (aId._id || aId))
if (entry) gs.splits[split] = entry
}
}
}
if (existing.sideBets && typeof existing.sideBets === 'object') {
setSideBets(prev => ({ ...prev, ...existing.sideBets }))
}
}
loadPicks(data, data.gender)
if (sibData) loadPicks(sibData, sibData.gender)
} catch { /* no existing picks */ }

setGenderState(state)
} catch (err) {
console.error(err)
setError('Failed to load race')
} finally {
setLoading(false)
}
}
fetchRace()
}, [id, user._id, initGenderState])

const getRaceForGender = useCallback((g) => {
if (!race) return null
if (g === race.gender) return race
return siblingRace
}, [race, siblingRace])

const genders = race && siblingRace
? [race.gender, siblingRace.gender].sort((a, b) => (a === 'M' ? -1 : 1))
: race ? [race.gender] : []

useEffect(() => {
if (genders.length > 0 && !genders.includes(mobileGenderTab)) {
setMobileGenderTab(genders[0])
}
}, [race?.gender, siblingRace?.gender])

const menRace = genders.includes('M') ? getRaceForGender('M') : null
const womenRace = genders.includes('F') ? getRaceForGender('F') : null

const getPickedIds = (gender) => {
const gs = genderState[gender]
if (!gs) return new Set()
const ids = new Set()
gs.slots.forEach(s => { if (s) ids.add(s.athlete?._id || s.athlete) })
return ids
}

const placeAthlete = (entry, gender) => {
if (!activeSlot || activeSlot.gender !== gender) return
const { type, index } = activeSlot
const athleteId = entry.athlete?._id || entry.athlete
isDirty.current = true

setGenderState(prev => {
const gs = { ...prev[gender] }
if (type === 'place') {
const newSlots = [...gs.slots]
const oldIdx = newSlots.findIndex(s => s && (s.athlete?._id || s.athlete) === athleteId)
if (oldIdx !== -1 && oldIdx !== index) {
newSlots[oldIdx] = null
if (gs.underdogIndex === oldIdx) gs.underdogIndex = -1
}
newSlots[index] = entry
gs.slots = newSlots
const raceForGender = getRaceForGender(gender)
const fieldSize = raceForGender?.startList?.length || 0
if (gs.underdogIndex === index && entry.startRank <= fieldSize / 2) {
gs.underdogIndex = -1
}
} else {
gs.splits = { ...gs.splits, [type]: entry }
}
return { ...prev, [gender]: gs }
})
setActiveSlot(null)
}

const dropAthleteOnSlot = (entry, gender, type, index) => {
const athleteId = entry.athlete?._id || entry.athlete
isDirty.current = true

setGenderState(prev => {
const gs = { ...prev[gender] }
if (type === 'place') {
const newSlots = [...gs.slots]
const oldIdx = newSlots.findIndex(s => s && (s.athlete?._id || s.athlete) === athleteId)
if (oldIdx !== -1 && oldIdx !== index) {
newSlots[oldIdx] = null
if (gs.underdogIndex === oldIdx) gs.underdogIndex = -1
}
newSlots[index] = entry
gs.slots = newSlots
const raceForGender = getRaceForGender(gender)
const fieldSize = raceForGender?.startList?.length || 0
if (gs.underdogIndex === index && entry.startRank <= fieldSize / 2) {
gs.underdogIndex = -1
}
} else {
gs.splits = { ...gs.splits, [type]: entry }
}
return { ...prev, [gender]: gs }
})
}

const removeFromSlot = (gender, index) => {
isDirty.current = true
setGenderState(prev => {
const gs = { ...prev[gender] }
const newSlots = [...gs.slots]
newSlots[index] = null
gs.slots = newSlots
if (gs.underdogIndex === index) gs.underdogIndex = -1
return { ...prev, [gender]: gs }
})
}

const removeSplit = (gender, split) => {
isDirty.current = true
setGenderState(prev => {
const gs = { ...prev[gender] }
gs.splits = { ...gs.splits, [split]: null }
return { ...prev, [gender]: gs }
})
}

const toggleUnderdog = (gender, index) => {
const gs = genderState[gender]
if (!gs || !gs.slots[index]) return
const entry = gs.slots[index]
const raceForGender = getRaceForGender(gender)
const fieldSize = raceForGender?.startList?.length || 0

if (entry.startRank <= fieldSize / 2) {
setUnderdogErrors(prev => ({
...prev,
[`${gender}-${index}`]: `Not eligible — must be ranked #${Math.floor(fieldSize / 2) + 1}+ (bottom half of ${fieldSize} athletes)`
}))
setTimeout(() => {
setUnderdogErrors(prev => { const next = { ...prev }; delete next[`${gender}-${index}`]; return next })
}, 5000)
return
}

isDirty.current = true
setGenderState(prev => {
const gs = { ...prev[gender] }
gs.underdogIndex = gs.underdogIndex === index ? -1 : index
return { ...prev, [gender]: gs }
})
}

const updateSideBet = (key, value) => {
isDirty.current = true
setSideBets(prev => ({ ...prev, [key]: value }))
}

const validatePicks = () => {
const errors = []
for (const g of genders) {
const gs = genderState[g]
const raceForGender = getRaceForGender(g)
if (!gs || !raceForGender || !raceForGender.startList?.length) continue
const label = race?.isPrivate ? 'Race' : (g === 'M' ? "Men's" : "Women's")
const fieldSize = raceForGender.startList?.length || 0
const requiredPicks = Math.min(5, fieldSize)

const filledSlots = gs.slots.filter(s => s !== null)
if (filledSlots.length < requiredPicks) {
errors.push(`${label}: Pick ${requiredPicks} athletes (you have ${filledSlots.length})`)
}

const ids = filledSlots.map(s => s.athlete?._id || s.athlete)
const uniqueIds = new Set(ids)
if (uniqueIds.size < ids.length) {
errors.push(`${label}: An athlete cannot be picked twice`)
}

if (!race?.isPrivate && (gs.underdogIndex === -1 || !gs.slots[gs.underdogIndex])) {
errors.push(`${label}: You must designate one pick as your underdog (bottom half of the field by start rank)`)
}
if(!race?.isPrivate){
if (!gs.splits.swim) errors.push(`${label}: Select fastest swimmer`)
if (!gs.splits.bike) errors.push(`${label}: Select fastest biker`)
if (!gs.splits.run) errors.push(`${label}: Select fastest runner`)
}
}
return errors
}

const savePicks = useCallback(async (stateToSave, sideBetsToSave) => {
if (!race) return
let hasAnyPicks = false
for (const g of Object.keys(stateToSave)) {
if (stateToSave[g].slots.some(s => s !== null)) { hasAnyPicks = true; break }
}
if (!hasAnyPicks) return

setSaveStatus('saving')
try {
const allComplete = Object.keys(stateToSave).every(g => {
const gs = stateToSave[g]
const raceForGender = getRaceForGender(g)
if (!raceForGender?.startList?.length) return true
const fieldSize = raceForGender.startList.length
const requiredPicks = Math.min(5, fieldSize)
const filledSlots = gs.slots.filter(s => s !== null).length
if (race?.isPrivate) return filledSlots >= requiredPicks
return gs.slots.every(s => s !== null) && gs.splits.swim && gs.splits.bike && gs.splits.run
})

const pickStatus = allComplete ? 'submitted' : 'draft'

for (const g of Object.keys(stateToSave)) {
const gs = stateToSave[g]
const filledSlots = gs.slots.map((s, i) => s ? { slot: i, entry: s } : null).filter(Boolean)
if (filledSlots.length === 0) continue
const raceForGender = getRaceForGender(g)
if (!raceForGender) continue

await api.post('/picks', {
user: user._id,
race: raceForGender._id,
picks: filledSlots.map(({ slot, entry }) => ({
athlete: entry.athlete?._id || entry.athlete,
predictedPlace: slot + 1,
isUnderdog: gs.underdogIndex === slot,
})),
fastestSplits: {
swim: gs.splits.swim ? (gs.splits.swim.athlete?._id || gs.splits.swim.athlete) : undefined,
bike: gs.splits.bike ? (gs.splits.bike.athlete?._id || gs.splits.bike.athlete) : undefined,
run: gs.splits.run ? (gs.splits.run.athlete?._id || gs.splits.run.athlete) : undefined,
},
sideBets: sideBetsToSave,
globalOptIn: gs.globalOptIn,
status: pickStatus
})
}

isDirty.current = false

setSaveStatus(allComplete ? 'submitted' : 'saved')
} catch {
setSaveStatus('')
}
}, [race, siblingRace, user?._id, getRaceForGender])

// Auto-save
useEffect(() => {
if (isInitialLoad.current) { isInitialLoad.current = false; return }
if (!race) return
const hasAny = Object.values(genderState).some(gs => gs.slots.some(s => s !== null))
if (!hasAny) return
if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
autoSaveTimer.current = setTimeout(() => { savePicks(genderState, sideBets) }, 2000)
return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
}, [genderState, sideBets, race, savePicks])

const handleSubmit = async () => {
setError('')
setSuccess('')
const errors = validatePicks()
if (errors.length > 0) { setValidationErrors(errors); return }
if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
await savePicks(genderState, sideBets)
setSuccess('Picks submitted successfully!')
setTimeout(() => setSuccess(''), 4000)
}

useEffect(() => {
const handler = (e) => { if (isDirty.current) { e.preventDefault(); e.returnValue = '' } }
window.addEventListener('beforeunload', handler)
return () => window.removeEventListener('beforeunload', handler)
}, [])

if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0A242]"></div></div>
if (!race) return <div className="max-w-4xl mx-auto px-4 py-8"><p className="text-[#E11D48]">Race not found</p></div>

const hasResults = race.results && race.results.length > 0
const allSideBetsConfig = race.sideBetsConfig || siblingRace?.sideBetsConfig || []

const handleAthleteClick = (entry, gender) => {
const athleteId = entry.athlete?._id || entry.athlete

// If a slot is active, place the athlete into that slot (existing flow)
if (activeSlot && activeSlot.gender === gender) {
placeAthlete(entry, gender)
setSelectedAthlete(null)
scrollToMobilePicks()
return
}

// If this athlete is already selected, deselect
if (selectedAthlete && (selectedAthlete.entry.athlete?._id || selectedAthlete.entry.athlete) === athleteId && selectedAthlete.gender === gender) {
setSelectedAthlete(null)
return
}

// If athlete is already placed for placement, still allow selection (for splits)
// Select the athlete — user will click a slot next
setSelectedAthlete({ entry, gender })
setActiveSlot(null)
scrollToMobilePicks()
}

const handleSlotClickWithSelected = (gender, index) => {
// If clicking an already-active slot, deselect it
if (activeSlot?.gender === gender && activeSlot?.type === 'place' && activeSlot?.index === index) {
setActiveSlot(null)
return
}
// If an athlete is pre-selected (athlete-first mode), place them
if (selectedAthlete && selectedAthlete.gender === gender) {
const athleteId = selectedAthlete.entry.athlete?._id || selectedAthlete.entry.athlete
isDirty.current = true
setGenderState(prev => {
const gs = { ...prev[gender] }
const newSlots = [...gs.slots]
const oldIdx = newSlots.findIndex(s => s && (s.athlete?._id || s.athlete) === athleteId)
if (oldIdx !== -1 && oldIdx !== index) {
newSlots[oldIdx] = null
if (gs.underdogIndex === oldIdx) gs.underdogIndex = -1
}
newSlots[index] = selectedAthlete.entry
gs.slots = newSlots
const raceForGender = getRaceForGender(gender)
const fieldSize = raceForGender?.startList?.length || 0
if (gs.underdogIndex === index && selectedAthlete.entry.startRank <= fieldSize / 2) {
gs.underdogIndex = -1
}
return { ...prev, [gender]: gs }
})
setSelectedAthlete(null)
scrollToMobileField()
return
}
// Otherwise, activate the slot (existing click-slot-first flow)
setActiveSlot({ gender, type: 'place', index })
setSelectedAthlete(null)
scrollToMobileField()
}

const handleSplitClickWithSelected = (gender, splitType) => {
// If clicking an already-active split slot, deselect it
if (activeSlot?.gender === gender && activeSlot?.type === splitType) {
setActiveSlot(null)
return
}
if (selectedAthlete && selectedAthlete.gender === gender) {
isDirty.current = true
setGenderState(prev => {
const gs = { ...prev[gender] }
gs.splits = { ...gs.splits, [splitType]: selectedAthlete.entry }
return { ...prev, [gender]: gs }
})
setSelectedAthlete(null)
scrollToMobileField()
return
}
setActiveSlot({ gender, type: splitType })
setSelectedAthlete(null)
scrollToMobileField()
}

const isWTCSRace = race?.series === 'WTCS'

const renderAthleteColumn = (gender, label, genderColor) => {
const raceForGender = getRaceForGender(gender)
const gs = genderState[gender]
if (!raceForGender || !gs) return null
const startList = raceForGender.startList || []
const pickedIds = getPickedIds(gender)
const search = gender === 'M' ? searchM : searchF
const setSearch = gender === 'M' ? setSearchM : setSearchF
const filteredList = search
? startList.filter(e => (e.athleteName || e.athlete?.name || '').toLowerCase().includes(search.toLowerCase()))
: startList
const isActiveForThis = activeSlot?.gender === gender
const hasSelectedAthlete = selectedAthlete?.gender === gender

return (
<div className="flex flex-col min-h-0">
<div className="flex items-center justify-between mb-2">
<h3 className={`text-sm font-bold ${genderColor}`}>{label}</h3>
<span className="text-sm text-[#9CA3AF]">{pickedIds.size}/5</span>
</div>
{hasSelectedAthlete && (
<div className="text-sm text-[#D0A242] bg-[rgba(208,162,66,0.08)] rounded px-2 py-1.5 mb-1.5 text-center">
Click a placement slot or split to assign <strong>{selectedAthlete.entry.athleteName || selectedAthlete.entry.athlete?.name}</strong>
</div>
)}
<input
type="text"
placeholder="Search..."
value={search}
onChange={e => setSearch(e.target.value)}
className="w-full bg-[rgba(245,243,238,0.6)] border border-[rgba(180,190,200,0.3)] rounded px-2.5 py-1.5 text-sm text-[#1F2937] placeholder-[#94A3B8] mb-1.5"
/>
<div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: '520px' }}>
{filteredList.map((entry, i) => {
const athleteId = entry.athlete?._id || entry.athlete
const isPickedForPlace = pickedIds.has(athleteId)
const placedSlotIdx = gs.slots.findIndex(s => s && (s.athlete?._id || s.athlete) === athleteId)
const isThisSelected = selectedAthlete && (selectedAthlete.entry.athlete?._id || selectedAthlete.entry.athlete) === athleteId && selectedAthlete.gender === gender
return (
<AthleteCard
key={'${athleteId}-${i}'}
entry={entry}
isPrivate={race?.isPrivate}
index={i}
isPicked={false}
isPickedForPlace={isPickedForPlace}
placedPosition={placedSlotIdx >= 0 ? placedSlotIdx + 1 : null}
onClick={() => handleAthleteClick(entry, gender)}
disabled={false}
activeSlotType={isActiveForThis ? (activeSlot.type === 'place' ? `#${activeSlot.index + 1}` : activeSlot.type) : null}
gender={gender}
isSelected={isThisSelected}
isWTCS={isWTCSRace}
/>
)
})}
{filteredList.length === 0 && (
<p className="text-xs text-[#9CA3AF] text-center py-4">No match</p>
)}
</div>
</div>
)
}

const renderPicksColumn = (gender, genderColor) => {
const gs = genderState[gender]
const raceForGender = getRaceForGender(gender)
if (!gs || !raceForGender) return null
const fieldSize = raceForGender.startList?.length || 0
const hasSelectedForGender = selectedAthlete?.gender === gender

return (
<div className="flex flex-col min-h-0">
<h3 className={`text-sm font-bold mb-2 ${genderColor}`}>
    {race?.isPrivate ? 'Race' : (gender === 'M' ? "Men's" : "Women's")} Picks
</h3>

<div className="space-y-1.5 mb-3">
{[0, 1, 2, 3, 4].filter(i => i < fieldSize).map(i => (
<PlacementSlot
key={i}
place={i + 1}
athlete={gs.slots[i]}
isUnderdog={gs.underdogIndex === i}
onRemove={() => removeFromSlot(gender, i)}
onToggleUnderdog={() => toggleUnderdog(gender, i)}
isActive={(activeSlot?.gender === gender && activeSlot?.type === 'place' && activeSlot?.index === i) || hasSelectedForGender}
onClick={() => handleSlotClickWithSelected(gender, i)}
gender={gender}
fieldSize={fieldSize}
underdogError={underdogErrors[`${gender}-${i}`]}
onDrop={(entry) => dropAthleteOnSlot(entry, gender, 'place', i)}
/>
))}
</div>

<div className="space-y-1.5">
<SplitSlot
label="Swim" color="text-[#22D3EE]"
selectedAthlete={gs.splits.swim}
isActive={(activeSlot?.gender === gender && activeSlot?.type === 'swim') || hasSelectedForGender}
onClick={() => handleSplitClickWithSelected(gender, 'swim')}
onRemove={() => removeSplit(gender, 'swim')}
onDrop={(entry) => dropAthleteOnSlot(entry, gender, 'swim')}
gender={gender}
/>
<SplitSlot
label="Bike" color="text-[#D0A242]"
selectedAthlete={gs.splits.bike}
isActive={(activeSlot?.gender === gender && activeSlot?.type === 'bike') || hasSelectedForGender}
onClick={() => handleSplitClickWithSelected(gender, 'bike')}
onRemove={() => removeSplit(gender, 'bike')}
onDrop={(entry) => dropAthleteOnSlot(entry, gender, 'bike')}
gender={gender}
/>
<SplitSlot
label="Run" color="text-[#E11D48]"
selectedAthlete={gs.splits.run}
isActive={(activeSlot?.gender === gender && activeSlot?.type === 'run') || hasSelectedForGender}
onClick={() => handleSplitClickWithSelected(gender, 'run')}
onRemove={() => removeSplit(gender, 'run')}
onDrop={(entry) => dropAthleteOnSlot(entry, gender, 'run')}
gender={gender}
/>
</div>
</div>
)
}

return (
<div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4">
<PageMeta title={`Picks — ${race?.eventName || race?.name || 'Make Picks'}`} />

{showLeaveWarning && (
<UnsavedModal
onStay={() => setShowLeaveWarning(false)}
onLeave={() => { setShowLeaveWarning(false); navigate(-1) }}
/>
)}
<ValidationModal errors={validationErrors} onClose={() => setValidationErrors(null)} />

{/* Sticky Header */}
<div className="sticky top-16 z-30 bg-[#ECF2F5]/95 backdrop-blur-sm pb-2 -mx-3 px-3 sm:-mx-6 sm:px-6 border-b border-[rgba(180,190,200,0.3)]">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
<div>
<button onClick={handleBack} className="text-sm text-[#D0A242] hover:text-[#C4963A] mb-0.5 inline-block">&larr; Back to Races</button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{race.eventName || race.name}</h1>
              {race.isPrivate && user && String(race.createdBy) === String(user._id) && (
                <Link to={`/races/${race._id}/edit`} className="px-3 py-1 rounded-lg bg-[#E8E3DA] hover:bg-[#F0EDE8] text-[#1F2937] text-xs font-semibold transition-colors">
                  Edit Race
                </Link>
              )}
            </div>
            <p className="text-sm text-[#9CA3AF]">
              {race.location} &bull; {race.series} &bull; Locks {new Date(race.lockTime).toLocaleString()}
            </p>
</div>
<div className="flex items-center gap-3">
<div className="text-sm">
{saveStatus === 'saving' && <span className="text-[#C4963A] font-medium">Saving...</span>}
{saveStatus === 'saved' && (
<span className="text-[#22D3EE] font-medium">Draft saved{lockCountdown ? ` · ${lockCountdown}` : ''}</span>
)}
{saveStatus === 'submitted' && <span className="text-[#D0A242] font-medium">Submitted!</span>}
{!saveStatus && lockCountdown && <span className="text-[#9CA3AF]">{lockCountdown}</span>}
</div>
<button onClick={handleSubmit} disabled={saveStatus === 'saving'} className="btn-primary px-5 text-sm whitespace-nowrap">
Submit Picks
</button>
</div>
</div>
</div>

{inviteCode && (
<div className="bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/20 rounded-lg px-4 py-3 mt-3 flex items-center justify-between gap-3">
<div className="flex items-center gap-3">
<span className="text-[#D0A242] text-lg">&#128279;</span>
<div>
<p className="text-sm font-medium text-[#C4963A]">Share this invite code with your friends</p>
<span className="text-xl font-mono font-bold text-[#D0A242] tracking-widest">{inviteCode}</span>
</div>
</div>
<button
onClick={() => {
const link = `${window.location.origin}/races/${id}`
navigator.clipboard.writeText(`Join my race! Code: ${inviteCode} — ${link}`)
setInviteCopied(true)
setTimeout(() => setInviteCopied(false), 2000)
}}
className="px-3 py-1.5 rounded-lg text-sm bg-[rgba(208,162,66,0.08)] text-[#C4963A] hover:bg-[#D0A242]/30 transition-colors whitespace-nowrap"
>
{inviteCopied ? 'Copied!' : 'Copy Code + Link'}
</button>
</div>
)}
{
race?.notes && (
    <div className="card mt-3 p-4">
        <h3 className="text-sm font-bold text-[#D0A242] mb-2">Race Notes</h3>
        <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{race.notes}</p>
    </div>
) }

{error && <div className="bg-[rgba(251,113,133,0.1)] border border-[#BE123C]/40 text-[#E11D48] rounded-lg px-4 py-2 mt-3 text-sm">{error}</div>}
{success && <div className="bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/30 text-[#D0A242] rounded-lg px-4 py-2 mt-3 text-sm">{success}</div>}

<div className="mt-3 mb-3" />

{/* Rules Blurb */}
<div className="card mb-4 py-3 px-4">
<button onClick={() => setRulesExpanded(!rulesExpanded)} className="w-full flex items-center justify-between text-left">
<div className="flex items-center gap-2">
<h2 className="text-sm font-bold text-[#D0A242]">How Picks Work</h2>
</div>
<span className="text-[#9CA3AF] text-sm">{rulesExpanded ? '▲' : '▼'}</span>
</button>
{rulesExpanded && (
<div className="mt-2 text-sm text-[#9CA3AF] space-y-1.5 leading-relaxed">
<p>
<strong className="text-[#1F2937]">Placements (1st–5th):</strong> Pick 5 athletes per gender and predict their finishing order.
Exact match = <span className="text-[#D0A242]">1.5x</span>, off by 1 = <span className="text-[#D0A242]">1.25x</span>,
off by 2 = <span className="text-[#D0A242]">1.1x</span>, off by 3–5 = <span className="text-[#D0A242]">1.0x</span>,
off by 6+ = <span className="text-[#D0A242]">0.5x</span>.
</p>
<p>
<strong className="text-[#1F2937]">Underdog ({race?.isPrivate ? 'optional' : 'required'}):</strong> One pick must be from the
<span className="text-[#D0A242]"> bottom half</span> of the start list. Underdog finishes top half =
<span className="text-[#D0A242]"> 2x</span>. Bottom quarter =
<span className="text-[#E11D48]"> 0.5x</span>.
{race?.isPrivate && <span className="text-[#9CA3AF] ml-1">(Optional for custom races — you can skip if you prefer.)</span>}
</p>
<p>
<strong className="text-[#1F2937]">Time Bonus (0–10 pts):</strong> Athletes earn bonus points based on how close their finish time is to the winner.
Closer to the winner = more points, scaling from <span className="text-[#D0A242]">10</span> (winner) down to <span className="text-[#D0A242]">0</span>.
</p>
<p>
<strong className="text-[#1F2937]">Fastest Splits:</strong> Predict fastest swim, bike, run.
1st = <span className="text-[#D0A242]">5 pts</span>, 2nd = <span className="text-[#C4963A]">3 pts</span>, 3rd = <span className="text-[#E11D48]">1 pt</span>.
<span className="text-[#D0A242]"> Only counts if the athlete finishes</span> — DNF = no credit.
</p>
<p>
<strong className="text-[#1F2937]">Side Bets:</strong> Bonus predictions —
Easy = <span className="text-[#D0A242]">+1 pt</span>,
Medium = <span className="text-[#C4963A]">+3 pts</span>,
Hard = <span className="text-[#E11D48]">+5 pts</span>.
</p>
</div>
)}
</div>

{/* === DESKTOP 4-COLUMN LAYOUT === */}
<div className="hidden lg:grid lg:grid-cols-[3fr_2fr_2fr_3fr] gap-3 mb-4">
<div className="card p-2">
{renderAthleteColumn('M', race?.isPrivate ? "Race Field" : "Men's Field", 'text-[#22D3EE]')}
</div>
<div className="card p-2">
{renderPicksColumn('M', 'text-[#22D3EE]')}
</div>
<div className="card p-2">
{renderPicksColumn('F', 'text-[#E11D48]')}
</div>
<div className="card p-2">
{renderAthleteColumn('F', race?.isPrivate ? "Race Field" : "Women's Field", 'text-[#E11D48]')}
</div>
</div>

{/* === MOBILE TABBED LAYOUT === */}
<div className="lg:hidden mb-4">
{genders.length > 1 && (
<div className="flex gap-1 mb-3 bg-[rgba(216,221,223,0.45)] rounded-lg p-1">
{genders.map(g => (
<button
key={g}
onClick={() => setMobileGenderTab(g)}
className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
mobileGenderTab === g
? g === 'M' ? 'bg-[#D0A242] text-[#1F2937]' : 'bg-[#BE123C] text-[#1F2937]'
: 'text-[#9CA3AF] hover:text-[#1F2937]'
}`}
>
{g === 'M' ? "Men" : "Women"}
</button>
))}
</div>
)}
{genders.map(g => {
if (genders.length > 1 && g !== mobileGenderTab) return null
const genderColor = g === 'M' ? 'text-[#22D3EE]' : 'text-[#E11D48]'
const label = race?.isPrivate ? "Race Field" : (g === 'M' ? "Men's Field" : "Women's Field")
return (
<div key={g} className="space-y-3">
<div ref={mobilePicksRef} className="card p-2">
{renderPicksColumn(g, genderColor)}
</div>
<div ref={mobileFieldRef} className="card p-2">
{renderAthleteColumn(g, label, genderColor)}
</div>
</div>
)
})}
</div>

{/* Side Bets (combined) */}
<div className="card mb-4">
<h3 className="text-sm font-semibold text-[#6B7280] mb-3">
Side Bets
<span className="text-xs text-[#9CA3AF] font-normal ml-2">Bonus points for extra predictions</span>
</h3>
{allSideBetsConfig.length > 0 ? (
<div className="space-y-2">
{allSideBetsConfig.map(bet => (
<div key={bet.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-[rgba(216,221,223,0.45)] rounded-lg">
<div className="flex-1">
<p className="text-sm text-[#1F2937]">{bet.prompt}</p>
<div className="flex items-center gap-2 mt-1">
<span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[bet.difficulty]}`}>
{bet.difficulty}
</span>
<span className="text-xs text-[#D0A242] font-semibold">{DIFFICULTY_POINTS[bet.difficulty] || bet.points} pts</span>
</div>
</div>
<div className="flex gap-2">
{bet.type === 'over_under' ? (
['over', 'under'].map(opt => (
<button
key={opt}
onClick={() => updateSideBet(bet.key, opt)}
className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
sideBets[bet.key] === opt ? 'bg-[#D0A242] text-[#1F2937]' : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]'
}`}
>{opt}</button>
))
) : bet.type === 'boolean' ? (
['yes', 'no'].map(opt => (
<button
key={opt}
onClick={() => updateSideBet(bet.key, opt)}
className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
sideBets[bet.key] === opt ? 'bg-[#D0A242] text-[#1F2937]' : 'bg-[#E8E3DA] text-[#6B7280] hover:bg-[#F0EDE8]'
}`}
>{opt}</button>
))
) : (
<input
type="text"
value={sideBets[bet.key] || ''}
onChange={(e) => updateSideBet(bet.key, e.target.value)}
className="bg-[#E8E3DA] border border-[rgba(180,190,200,0.3)] rounded-lg px-3 py-1.5 text-sm text-[#1F2937]"
placeholder="Your answer"
/>
)}
</div>
</div>
))}
</div>
) : (
<p className="text-sm text-[#9CA3AF] italic">No side bets for this race.</p>
)}
</div>

{/* Pick Summary (after side bets) */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
{genders.map(g => {
const gs = genderState[g]
if (!gs) return null
const label = race?.isPrivate ? "Race Field" : (g === 'M' ? "Men's" : "Women's")
const genderColor = g === 'M' ? 'text-[#22D3EE]' : 'text-[#E11D48]'
return (
<div key={g} className="card p-3">
<h3 className={`text-xs font-bold mb-2 ${genderColor}`}>{label} Summary</h3>
<div className="text-xs text-[#9CA3AF] mb-2">

<span className={gs.slots.filter(s => s).length >= Math.min(5, (getRaceForGender(g)?.startList?.length || 5)) ? 'text-[#D0A242]' : ''}>
{gs.slots.filter(s => s).length} / {Math.min(5, (getRaceForGender(g)?.startList?.length || 5))} placed
</span>
{' | '}
<span className={gs.underdogIndex >= 0 ? 'text-[#D0A242]' : 'text-[#D0A242]'}>
{gs.underdogIndex >= 0 ? 'Underdog set' : 'Need underdog'}
</span>
{' | '}
<span className={Object.values(gs.splits).every(s => s) ? 'text-[#D0A242]' : ''}>
{Object.values(gs.splits).filter(s => s).length}/3 splits
</span>
</div>
<div className="space-y-1">
{gs.slots.map((s, i) => s && (
<div key={i} className={`text-xs p-1.5 rounded ${gs.underdogIndex === i ? 'bg-[rgba(208,162,66,0.08)] border border-[#D0A242]/20' : 'bg-[rgba(245,243,238,0.6)]'}`}>
<span className="font-bold">{i + 1}.</span> {s.athleteName || s.name}
{gs.underdogIndex === i && <span className="text-[#D0A242] ml-1">(Underdog)</span>}
<span className="text-[#9CA3AF] ml-1">#{s.startRank}</span>
</div>
))}
{gs.splits.swim && <div className="text-xs p-1.5 bg-[rgba(208,162,66,0.08)] rounded">&#127946; {gs.splits.swim.athleteName || gs.splits.swim.name}</div>}
{gs.splits.bike && <div className="text-xs p-1.5 bg-[rgba(208,162,66,0.08)] rounded">&#128692; {gs.splits.bike.athleteName || gs.splits.bike.name}</div>}
{gs.splits.run && <div className="text-xs p-1.5 bg-[rgba(208,162,66,0.08)] rounded">&#127939; {gs.splits.run.athleteName || gs.splits.run.name}</div>}
</div>
</div>
)
})}
</div>

{/* Bottom submit */}
<div className="sticky bottom-0 bg-[#ECF2F5]/95 backdrop-blur-sm py-2 -mx-3 px-3 sm:-mx-6 sm:px-6 border-t border-[rgba(180,190,200,0.3)]">
<div className="flex items-center justify-between">
<div className="text-sm">
{saveStatus === 'saving' && <span className="text-[#C4963A] font-medium">Saving...</span>}
{saveStatus === 'saved' && (
<span className="text-[#22D3EE] font-medium">Draft saved{lockCountdown ? ` · ${lockCountdown}` : ''}</span>
)}
{saveStatus === 'submitted' && <span className="text-[#D0A242] font-medium">All picks submitted!</span>}
{!saveStatus && <span className="text-[#9CA3AF]">{lockCountdown || 'Auto-saves as you go'}</span>}
</div>
<button onClick={handleSubmit} disabled={saveStatus === 'saving'} className="btn-primary px-6 text-sm">
Submit Picks
</button>
</div>
</div>

{hasResults && (
<div className="card mt-6">
<h2 className="text-xl font-semibold mb-4">Results</h2>
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="text-left text-[#9CA3AF] border-b border-[rgba(180,190,200,0.3)]">
<th className="pb-2 pr-4">Place</th>
<th className="pb-2 pr-4">Athlete</th>
<th className="pb-2 pr-4">Score</th>
<th className="pb-2">Status</th>
</tr>
</thead>
<tbody>
{race.results
.sort((a, b) => (a.place || 999) - (b.place || 999))
.map((result, i) => (
<tr key={i} className="border-b border-[rgba(180,190,200,0.3)]">
<td className="py-2 pr-4">{result.place || '-'}</td>
<td className="py-2 pr-4 font-medium">{result.athleteName || 'Unknown'}</td>
<td className="py-2 pr-4 text-[#D0A242] font-semibold">{result.score || 0}</td>
<td className="py-2">
<span className={`text-xs px-2 py-0.5 rounded ${
result.status === 'Finished' ? 'bg-[rgba(208,162,66,0.08)] text-[#D0A242]' : 'bg-[rgba(251,113,133,0.1)] text-[#E11D48]'
}`}>{result.status}</span>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
)}
</div>
)
}