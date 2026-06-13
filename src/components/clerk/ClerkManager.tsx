import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { UserPlus, UserMinus, Moon, Briefcase, RefreshCw, Coins, AlertTriangle, Star, Heart, TrendingUp, Clock, Award } from 'lucide-react';
import { getClerkTypeInfo, getPersonalityInfo, getSpecialtyInfo } from '../../utils/gameLogic';
import type { Clerk, ClerkCandidate, ClerkAssignment } from '../../../shared/types';

const ASSIGNMENT_INFO: Record<ClerkAssignment, { name: string; icon: string }> = {
  idle: { name: '待命', icon: '⏸️' },
  reception: { name: '接单', icon: '📋' },
  warehouse: { name: '理仓', icon: '📦' },
  escort: { name: '押车', icon: '🛡️' },
};

const ClerkCard = ({ clerk }: { clerk: Clerk }) => {
  const { dismissClerk, assignClerk, restClerk } = useGameStore();
  const typeInfo = getClerkTypeInfo(clerk.type);
  const personalityInfo = getPersonalityInfo(clerk.personality);
  const specialtyInfo = getSpecialtyInfo(clerk.specialty);
  
  const fatigueRatio = clerk.fatigue / clerk.maxFatigue;
  const expRatio = clerk.experience / clerk.experienceToNextLevel;
  
  const [showAssign, setShowAssign] = useState(false);
  
  const getFatigueColor = () => {
    if (fatigueRatio > 0.8) return 'bg-red-500';
    if (fatigueRatio > 0.5) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const assignments: ClerkAssignment[] = ['idle', 'reception', 'warehouse', 'escort'];
  
  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
            {typeInfo.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{clerk.name}</h3>
            <p className="text-sm text-slate-500">{typeInfo.name} · Lv.{clerk.level}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          fatigueRatio > 0.8 ? 'bg-red-100 text-red-700' :
          fatigueRatio > 0.5 ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {ASSIGNMENT_INFO[clerk.assignment].icon} {ASSIGNMENT_INFO[clerk.assignment].name}
        </span>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">性格</span>
          <span className="text-slate-700 font-medium">{personalityInfo.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">专长</span>
          <span className="text-slate-700 font-medium">{specialtyInfo.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">日薪</span>
          <span className="text-amber-600 font-medium flex items-center gap-1">
            <Coins className="w-4 h-4" />
            {clerk.salary}
          </span>
        </div>
      </div>
      
      <div className="space-y-2 mb-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Heart className="w-3 h-3" /> 疲劳
            </span>
            <span className="text-slate-600">{clerk.fatigue}/{clerk.maxFatigue}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full ${getFatigueColor()} transition-all`} style={{ width: `${fatigueRatio * 100}%` }} />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 经验
            </span>
            <span className="text-slate-600">{clerk.experience}/{clerk.experienceToNextLevel}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${expRatio * 100}%` }} />
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {clerk.abilities.map(ability => (
          <span
            key={ability.id}
            className={`text-xs px-2 py-1 rounded-full ${
              ability.unlocked
                ? 'bg-purple-100 text-purple-700'
                : 'bg-slate-100 text-slate-400'
            }`}
            title={ability.description}
          >
            {ability.unlocked ? '✨' : '🔒'} {ability.name}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-slate-400 mb-3">
        <span>在职 {clerk.daysEmployed} 天</span>
        <span>完成 {clerk.totalTasksCompleted} 次任务</span>
        <span>失误 {clerk.totalMistakes} 次</span>
      </div>
      
      {fatigueRatio > 0.7 && (
        <div className="mb-3 p-2 bg-red-50 rounded-lg flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>疲劳度过高，容易犯错！</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowAssign(!showAssign)}
            disabled={!!clerk.assignedTripId}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Briefcase className="w-4 h-4" />
            分配
          </button>
          
          {showAssign && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10">
              {assignments.map(assign => (
                <button
                  key={assign}
                  onClick={() => {
                    assignClerk(clerk.id, assign);
                    setShowAssign(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                    clerk.assignment === assign ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  <span>{ASSIGNMENT_INFO[assign].icon}</span>
                  <span>{ASSIGNMENT_INFO[assign].name}</span>
                  {assign === specialtyInfo.bestAssignment && (
                    <Star className="w-3 h-3 text-yellow-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => restClerk(clerk.id)}
          disabled={!!clerk.assignedTripId || fatigueRatio < 0.3}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="休息恢复疲劳"
        >
          <Moon className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => {
            if (confirm(`确定要解雇 ${clerk.name} 吗？将支付 ${clerk.salary * 2} 金币遣散费。`)) {
              dismissClerk(clerk.id);
            }
          }}
          disabled={!!clerk.assignedTripId}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const CandidateCard = ({ candidate }: { candidate: ClerkCandidate }) => {
  const { hireClerk, player } = useGameStore();
  const typeInfo = getClerkTypeInfo(candidate.type);
  const personalityInfo = getPersonalityInfo(candidate.personality);
  const specialtyInfo = getSpecialtyInfo(candidate.specialty);
  
  const hireFee = candidate.salary * 3;
  const canAfford = player.gold >= hireFee;
  
  return (
    <div className="bg-white rounded-xl shadow-md p-4 border-2 border-dashed border-slate-300 hover:border-amber-400 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-2xl">
            {typeInfo.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{candidate.name}</h3>
            <p className="text-sm text-slate-500">{typeInfo.name}</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          招募中
        </span>
      </div>
      
      <p className="text-sm text-slate-600 mb-3">{candidate.description}</p>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">性格</span>
          <span className="text-slate-700 font-medium">{personalityInfo.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">专长</span>
          <span className="text-slate-700 font-medium">{specialtyInfo.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">日薪</span>
          <span className="text-amber-600 font-medium flex items-center gap-1">
            <Coins className="w-4 h-4" />
            {candidate.salary}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {candidate.traits.map((trait, idx) => (
          <span key={idx} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            {trait}
          </span>
        ))}
      </div>
      
      <button
        onClick={() => hireClerk(candidate.id)}
        disabled={!canAfford}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          canAfford
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        <UserPlus className="w-4 h-4" />
        招募 ({hireFee} 金币)
      </button>
    </div>
  );
};

const ClerkManager = () => {
  const { clerks, clerkCandidates, refreshClerkCandidates, lastClerkRefreshDay, player, payClerkSalaries } = useGameStore();
  const [activeTab, setActiveTab] = useState<'staff' | 'candidates'>('staff');
  
  const activeClerks = clerks.filter(c => c.status !== 'dismissed');
  const totalSalary = activeClerks.reduce((sum, c) => sum + c.salary, 0);
  const maxClerks = 8;
  
  const receptionBonus = useGameStore(state => state.getClerkBonuses('reception'));
  const warehouseBonus = useGameStore(state => state.getClerkBonuses('warehouse'));
  const escortBonus = useGameStore(state => state.getClerkBonuses('escort'));
  
  const BonusDisplay = ({ title, bonus }: { title: string; bonus: any }) => (
    <div className="bg-white rounded-lg p-3 shadow-sm">
      <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {bonus.rewardBonus > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">奖励加成</span>
            <span className="text-green-600">+{Math.round(bonus.rewardBonus * 100)}%</span>
          </div>
        )}
        {bonus.damageReduction > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">减伤</span>
            <span className="text-blue-600">+{Math.round(bonus.damageReduction * 100)}%</span>
          </div>
        )}
        {bonus.speedBonus > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">速度加成</span>
            <span className="text-purple-600">+{Math.round(bonus.speedBonus * 100)}%</span>
          </div>
        )}
        {bonus.capacityBonus > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">容量加成</span>
            <span className="text-orange-600">+{Math.round(bonus.capacityBonus * 100)}%</span>
          </div>
        )}
        {bonus.negotiationBonus > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">谈判加成</span>
            <span className="text-pink-600">+{Math.round(bonus.negotiationBonus * 100)}%</span>
          </div>
        )}
        {bonus.mistakeChance > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">犯错几率</span>
            <span className="text-red-600">{Math.round(bonus.mistakeChance * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">跑腿伙计</h1>
        <p className="text-slate-500">招募和管理你的伙计，他们将协助你接单、理仓和押运货物</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5" />
            <span className="font-medium">伙计数量</span>
          </div>
          <p className="text-3xl font-bold">{activeClerks.length}/{maxClerks}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5" />
            <span className="font-medium">日薪支出</span>
          </div>
          <p className="text-3xl font-bold">{totalSalary} 金币</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">候选刷新</span>
          </div>
          <p className="text-lg font-bold">每 3 天</p>
          <p className="text-xs opacity-80">上次: 第 {lastClerkRefreshDay} 天</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5" />
            <span className="font-medium">当前资金</span>
          </div>
          <p className="text-3xl font-bold">{player.gold} 金币</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BonusDisplay title="📋 接单加成" bonus={receptionBonus} />
        <BonusDisplay title="📦 理仓加成" bonus={warehouseBonus} />
        <BonusDisplay title="🛡️ 押车加成" bonus={escortBonus} />
      </div>
      
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'staff'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            我的伙计 ({activeClerks.length})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'candidates'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            招募候选 ({clerkCandidates.length})
          </button>
        </div>
        
        <div className="flex gap-2 ml-auto">
          {activeTab === 'candidates' && (
            <button
              onClick={refreshClerkCandidates}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              刷新 (50 金币)
            </button>
          )}
          {activeTab === 'staff' && activeClerks.length > 0 && (
            <button
              onClick={payClerkSalaries}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <Coins className="w-4 h-4" />
              支付薪水 ({totalSalary} 金币)
            </button>
          )}
        </div>
      </div>
      
      {activeTab === 'staff' && (
        <>
          {activeClerks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 mb-2">还没有伙计</h3>
              <p className="text-slate-400 mb-4">去招募候选页面看看有没有合适的人选吧</p>
              <button
                onClick={() => setActiveTab('candidates')}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                查看候选
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeClerks.map(clerk => (
                <ClerkCard key={clerk.id} clerk={clerk} />
              ))}
            </div>
          )}
        </>
      )}
      
      {activeTab === 'candidates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clerkCandidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClerkManager;
