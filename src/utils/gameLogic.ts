import type { 
  Commission, 
  Goods, 
  City, 
  Weather, 
  GameEvent,
  Player,
  PlayerVehicle,
  Warehouse,
  SaveGame,
  Trip,
  Clerk,
  ClerkCandidate,
  ClerkType,
  ClerkPersonality,
  ClerkSpecialty,
  ClerkAbility,
  ClerkBonus,
  ClerkAssignment,
} from '../../shared/types';
import { calculateReputationGrade, calculateWarehouseCapacity, calculateWarehouseUpgradeCost } from './settlement';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentDate = (day: number): string => {
  const baseDate = new Date('2024-01-01');
  baseDate.setDate(baseDate.getDate() + day - 1);
  return `${baseDate.getFullYear()}年${baseDate.getMonth() + 1}月${baseDate.getDate()}日`;
};

export const generateRandomCommissions = (
  goodsList: Goods[],
  cities: City[],
  reputationGrade: string,
  count: number = 6
): Commission[] => {
  const commissions: Commission[] = [];
  const destinations = cities.filter(c => c.id !== 'yuegang');
  
  let qualityMultiplier = 1;
  if (reputationGrade === '甲') qualityMultiplier = 1.5;
  else if (reputationGrade === '乙') qualityMultiplier = 1.2;
  else if (reputationGrade === '丁') qualityMultiplier = 0.8;
  
  for (let i = 0; i < count; i++) {
    const goods = goodsList[Math.floor(Math.random() * goodsList.length)];
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    
    const baseQuantity = Math.floor(Math.random() * 15) + 5;
    const quantity = Math.ceil(baseQuantity * qualityMultiplier);
    
    const baseReward = goods.basePrice * quantity;
    const rewardMultiplier = 1.2 + Math.random() * 0.6;
    const reward = Math.floor(baseReward * rewardMultiplier * qualityMultiplier);
    
    const deadlineBase = 12 + Math.floor(Math.random() * 36);
    const deadlineHours = Math.ceil(deadlineBase / qualityMultiplier);
    
    const isEmergency = Math.random() < 0.2;
    const finalReward = isEmergency ? Math.floor(reward * 1.5) : reward;
    const finalDeadline = isEmergency ? Math.ceil(deadlineHours * 0.7) : deadlineHours;
    
    commissions.push({
      id: generateId(),
      goodsId: goods.id,
      goodsName: goods.name,
      destinationId: destination.id,
      destinationName: destination.name,
      quantity,
      reward: finalReward,
      deadlineHours: finalDeadline,
      fragility: goods.fragility,
      isAccepted: false,
      createdAt: Date.now(),
    });
  }
  
  return commissions;
};

export const getRandomWeather = (weatherList: Weather[]): Weather => {
  const weights = [40, 25, 12, 5, 8, 4, 3, 3];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weatherList.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return weatherList[i];
    }
  }
  
  return weatherList[0];
};

export const getRandomEvents = (
  eventsList: GameEvent[],
  routeType: 'land' | 'water',
  count: number = 2
): GameEvent[] => {
  const filteredEvents = eventsList.filter(e => {
    if (routeType === 'water' && e.id === 'bandit') return false;
    if (routeType === 'land' && e.id === 'pirate') return false;
    return true;
  });
  
  const selected: GameEvent[] = [];
  const shuffled = [...filteredEvents].sort(() => Math.random() - 0.5);
  
  for (const event of shuffled) {
    if (selected.length >= count) break;
    if (Math.random() < event.probability * 2) {
      selected.push(event);
    }
  }
  
  return selected;
};

export const createInitialPlayer = (): Player => {
  return {
    id: generateId(),
    name: '月港邮差',
    gold: 1000,
    reputation: 600,
    reputationGrade: '丙',
    priceBonus: 0,
    currentDay: 1,
    timeOfDay: 'morning',
  };
};

export const createInitialVehicles = (): PlayerVehicle[] => {
  return [
    {
      id: generateId(),
      vehicleId: 'donkey-cart',
      name: '驴车',
      type: 'land',
      capacity: 50,
      speed: 12,
      costPerHour: 5,
      icon: '🐴',
      isAvailable: true,
    },
    {
      id: generateId(),
      vehicleId: 'small-boat',
      name: '小渡船',
      type: 'water',
      capacity: 80,
      speed: 20,
      costPerHour: 15,
      icon: '⛵',
      isAvailable: true,
    },
  ];
};

export const createInitialWarehouse = (): Warehouse => {
  const level = 1;
  return {
    id: generateId(),
    level,
    capacity: calculateWarehouseCapacity(level),
    usedSpace: 0,
    upgradeCost: calculateWarehouseUpgradeCost(level),
  };
};

export const createInitialSaveGame = (): SaveGame => {
  const player = createInitialPlayer();
  const repInfo = calculateReputationGrade(player.reputation);
  player.reputationGrade = repInfo.grade;
  player.priceBonus = repInfo.priceBonus;
  
  return {
    player,
    commissions: [],
    trips: [],
    vehicles: createInitialVehicles(),
    warehouse: createInitialWarehouse(),
    ledger: [],
    clerks: createInitialClerks(),
    clerkCandidates: createInitialClerkCandidates(),
    lastClerkRefreshDay: 1,
    currentWeatherId: 'sunny',
    savedAt: Date.now(),
  };
};

export const advanceTime = (player: Player): Player => {
  const timeOrder: Player['timeOfDay'][] = ['morning', 'afternoon', 'evening', 'night'];
  const currentIndex = timeOrder.indexOf(player.timeOfDay);
  
  let newTimeOfDay: Player['timeOfDay'];
  let newDay = player.currentDay;
  
  if (currentIndex === timeOrder.length - 1) {
    newTimeOfDay = 'morning';
    newDay += 1;
  } else {
    newTimeOfDay = timeOrder[currentIndex + 1];
  }
  
  return {
    ...player,
    timeOfDay: newTimeOfDay,
    currentDay: newDay,
  };
};

export const getTimeOfDayName = (timeOfDay: Player['timeOfDay']): string => {
  const names: Record<Player['timeOfDay'], string> = {
    morning: '清晨',
    afternoon: '午后',
    evening: '傍晚',
    night: '夜晚',
  };
  return names[timeOfDay];
};

export const canAcceptCommission = (
  commission: Commission,
  warehouse: Warehouse,
  goodsList: Goods[],
  acceptedCommissions: Commission[]
): { canAccept: boolean; reason?: string } => {
  const goods = goodsList.find(g => g.id === commission.goodsId);
  if (!goods) {
    return { canAccept: false, reason: '货物信息不存在' };
  }
  
  const newLoad = commission.quantity * goods.weight;
  const currentLoad = acceptedCommissions.reduce((total, c) => {
    const g = goodsList.find(good => good.id === c.goodsId);
    return total + (c.quantity * (g?.weight || 1));
  }, 0);
  
  if (currentLoad + newLoad > warehouse.capacity) {
    return { canAccept: false, reason: '仓库容量不足' };
  }
  
  return { canAccept: true };
};

export const calculateWarehouseUsedSpace = (
  commissions: Commission[],
  goodsList: Goods[],
  completedTrips: Trip[]
): number => {
  const activeCommissions = commissions.filter(c => c.isAccepted && !c.isCompleted);
  
  return activeCommissions.reduce((total, commission) => {
    const goods = goodsList.find(g => g.id === commission.goodsId);
    return total + (commission.quantity * (goods?.weight || 1));
  }, 0);
};

export const getTimeOfDayHours = (timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): number => {
  const hoursMap: Record<'morning' | 'afternoon' | 'evening' | 'night', number> = {
    morning: 6,
    afternoon: 12,
    evening: 18,
    night: 24,
  };
  return hoursMap[timeOfDay];
};

export const calculateTotalGameHours = (day: number, timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): number => {
  return (day - 1) * 24 + getTimeOfDayHours(timeOfDay);
};

export const calculateIsLateGameTime = (
  acceptedGameHours: number,
  deadlineHours: number,
  departedGameHours: number,
  totalTripHours: number,
  extraDelay: number
): boolean => {
  const deadlineGameTime = acceptedGameHours + deadlineHours;
  const arrivalGameTime = departedGameHours + totalTripHours + extraDelay;
  return arrivalGameTime > deadlineGameTime;
};

const CLERK_NAMES: Record<ClerkType, string[]> = {
  accountant: ['李账房', '王算盘', '张司库', '刘管事', '陈主簿', '赵会计', '孙记室', '周出纳'],
  porter: ['阿大', '阿二', '王铁柱', '李大壮', '张老实', '刘黑子', '陈大力', '赵千斤'],
  guide: ['老马识途', '路通', '向导王', '李寻路', '张辨向', '刘识途', '陈地形', '赵山川'],
  guard: ['周镖头', '吴护院', '郑拳师', '冯铁手', '卫豹', '蒋雄', '沈威', '韩勇'],
};

const PERSONALITY_INFO: Record<ClerkPersonality, { name: string; description: string; effects: Partial<ClerkBonus> }> = {
  diligent: { name: '勤勉', description: '工作认真，不易疲劳', effects: { fatigueReduction: 0.2 } },
  careful: { name: '细心', description: '做事谨慎，不易犯错', effects: { mistakeChance: -0.1 } },
  bold: { name: '大胆', description: '敢闯敢拼，奖励更高但风险大', effects: { rewardBonus: 0.1, mistakeChance: 0.05 } },
  cautious: { name: '谨慎', description: '稳扎稳打，减少损失', effects: { damageReduction: 0.1 } },
  cheerful: { name: '开朗', description: '善于交际，谈判能力强', effects: { negotiationBonus: 0.1 } },
  gloomy: { name: '阴沉', description: '专注工作，不易受干扰', effects: { capacityBonus: 0.05 } },
  shrewd: { name: '精明', description: '善于算计，奖励加成', effects: { rewardBonus: 0.08 } },
  honest: { name: '诚实', description: '值得信赖，声望加成', effects: { negotiationBonus: 0.05, mistakeChance: -0.05 } },
};

const SPECIALTY_INFO: Record<ClerkSpecialty, { name: string; description: string; bestAssignment: ClerkAssignment; effects: Partial<ClerkBonus> }> = {
  reception: { name: '接待', description: '善于接洽客户，适合接单', bestAssignment: 'reception', effects: { rewardBonus: 0.05, negotiationBonus: 0.1 } },
  organization: { name: '统筹', description: '善于规划管理，适合理仓', bestAssignment: 'warehouse', effects: { capacityBonus: 0.1, fatigueReduction: 0.1 } },
  navigation: { name: '识途', description: '熟悉路线，适合随车向导', bestAssignment: 'escort', effects: { speedBonus: 0.1, damageReduction: 0.05 } },
  combat: { name: '勇武', description: '武艺高强，适合押车', bestAssignment: 'escort', effects: { damageReduction: 0.15 } },
  negotiation: { name: '谈判', description: '能言善辩，提高收益', bestAssignment: 'reception', effects: { rewardBonus: 0.1, negotiationBonus: 0.15 } },
  maintenance: { name: '维护', description: '保养有方，减少损耗', bestAssignment: 'warehouse', effects: { damageReduction: 0.05, capacityBonus: 0.05 } },
};

const ABILITY_TEMPLATES: Record<ClerkType, Omit<ClerkAbility, 'unlocked'>[]> = {
  accountant: [
    { id: 'acc_1', name: '精明算账', description: '接单时额外获得5%金币奖励', requiredLevel: 2, effect: { type: 'reward_bonus', value: 0.05 } },
    { id: 'acc_2', name: '税务精通', description: '所有收入减少5%损耗', requiredLevel: 4, effect: { type: 'reward_bonus', value: 0.05 } },
    { id: 'acc_3', name: '金融奇才', description: '谈判时价格加成提升10%', requiredLevel: 6, effect: { type: 'negotiation_bonus', value: 0.1 } },
  ],
  porter: [
    { id: 'por_1', name: '力大无穷', description: '仓库容量增加10%', requiredLevel: 2, effect: { type: 'capacity_bonus', value: 0.1 } },
    { id: 'por_2', name: '轻拿轻放', description: '货物损坏率降低10%', requiredLevel: 4, effect: { type: 'damage_reduction', value: 0.1 } },
    { id: 'por_3', name: '不知疲倦', description: '疲劳增长减少20%', requiredLevel: 6, effect: { type: 'fatigue_reduction', value: 0.2 } },
  ],
  guide: [
    { id: 'gui_1', name: '轻车熟路', description: '运输速度提升8%', requiredLevel: 2, effect: { type: 'speed_bonus', value: 0.08 } },
    { id: 'gui_2', name: '避凶趋吉', description: '遇到灾害的几率降低15%', requiredLevel: 4, effect: { type: 'damage_reduction', value: 0.15 } },
    { id: 'gui_3', name: '神行太保', description: '运输速度再提升12%', requiredLevel: 6, effect: { type: 'speed_bonus', value: 0.12 } },
  ],
  guard: [
    { id: 'gua_1', name: '拳脚了得', description: '遇到劫匪损失减少15%', requiredLevel: 2, effect: { type: 'damage_reduction', value: 0.15 } },
    { id: 'gua_2', name: '威风凛凛', description: '震慑宵小，犯错几率降低10%', requiredLevel: 4, effect: { type: 'mistake_chance_reduction', value: 0.1 } },
    { id: 'gua_3', name: '万夫莫敌', description: '随车时完全避免重大损失', requiredLevel: 6, effect: { type: 'damage_reduction', value: 0.25 } },
  ],
};

const CLERK_TYPE_INFO: Record<ClerkType, { name: string; description: string; icon: string; baseSalary: number; baseFatigue: number }> = {
  accountant: { name: '账房', description: '负责接洽客户、谈判价格', icon: '📜', baseSalary: 80, baseFatigue: 100 },
  porter: { name: '脚夫', description: '负责仓库管理、货物搬运', icon: '💪', baseSalary: 50, baseFatigue: 120 },
  guide: { name: '向导', description: '负责指引路线、避开危险', icon: '🧭', baseSalary: 70, baseFatigue: 100 },
  guard: { name: '押车学徒', description: '负责押运货物、应对劫匪', icon: '⚔️', baseSalary: 90, baseFatigue: 110 },
};

export const getClerkTypeInfo = (type: ClerkType) => CLERK_TYPE_INFO[type];
export const getPersonalityInfo = (personality: ClerkPersonality) => PERSONALITY_INFO[personality];
export const getSpecialtyInfo = (specialty: ClerkSpecialty) => SPECIALTY_INFO[specialty];

export const createInitialAbilities = (type: ClerkType): ClerkAbility[] => {
  return ABILITY_TEMPLATES[type].map(a => ({ ...a, unlocked: false }));
};

export const generateClerkCandidates = (count: number = 4): ClerkCandidate[] => {
  const types: ClerkType[] = ['accountant', 'porter', 'guide', 'guard'];
  const personalities: ClerkPersonality[] = ['diligent', 'careful', 'bold', 'cautious', 'cheerful', 'gloomy', 'shrewd', 'honest'];
  const specialties: ClerkSpecialty[] = ['reception', 'organization', 'navigation', 'combat', 'negotiation', 'maintenance'];
  
  const candidates: ClerkCandidate[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    const specialty = specialties[Math.floor(Math.random() * specialties.length)];
    const names = CLERK_NAMES[type];
    const name = names[Math.floor(Math.random() * names.length)];
    const baseSalary = CLERK_TYPE_INFO[type].baseSalary;
    const salaryVariation = Math.floor((Math.random() - 0.5) * 20);
    const salary = Math.max(30, baseSalary + salaryVariation);
    
    const personalityInfo = PERSONALITY_INFO[personality];
    const specialtyInfo = SPECIALTY_INFO[specialty];
    
    const traits: string[] = [];
    if (personalityInfo.effects.rewardBonus) traits.push(`奖励+${Math.round(personalityInfo.effects.rewardBonus * 100)}%`);
    if (personalityInfo.effects.damageReduction) traits.push(`减伤+${Math.round(personalityInfo.effects.damageReduction * 100)}%`);
    if (personalityInfo.effects.speedBonus) traits.push(`速度+${Math.round(personalityInfo.effects.speedBonus * 100)}%`);
    if (personalityInfo.effects.capacityBonus) traits.push(`容量+${Math.round(personalityInfo.effects.capacityBonus * 100)}%`);
    if (personalityInfo.effects.negotiationBonus) traits.push(`谈判+${Math.round(personalityInfo.effects.negotiationBonus * 100)}%`);
    if (personalityInfo.effects.mistakeChance && personalityInfo.effects.mistakeChance < 0) traits.push(`犯错-${Math.round(Math.abs(personalityInfo.effects.mistakeChance) * 100)}%`);
    if (personalityInfo.effects.mistakeChance && personalityInfo.effects.mistakeChance > 0) traits.push(`犯错+${Math.round(personalityInfo.effects.mistakeChance * 100)}%`);
    
    candidates.push({
      id: generateId(),
      type,
      name,
      personality,
      specialty,
      salary,
      description: `${personalityInfo.name}的${CLERK_TYPE_INFO[type].name}，专精${specialtyInfo.name}。${personalityInfo.description}。`,
      traits,
    });
  }
  
  return candidates;
};

export const hireClerk = (candidate: ClerkCandidate): Clerk => {
  const typeInfo = CLERK_TYPE_INFO[candidate.type];
  
  return {
    id: generateId(),
    type: candidate.type,
    name: candidate.name,
    personality: candidate.personality,
    specialty: candidate.specialty,
    salary: candidate.salary,
    fatigue: 0,
    maxFatigue: typeInfo.baseFatigue,
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    status: 'available',
    assignment: 'idle',
    abilities: createInitialAbilities(candidate.type),
    daysEmployed: 0,
    performanceScore: 50,
    totalMistakes: 0,
    totalTasksCompleted: 0,
    hiredAt: Date.now(),
  };
};

export const calculateClerkBonus = (clerk: Clerk, assignment: ClerkAssignment): ClerkBonus => {
  const bonus: ClerkBonus = {
    rewardBonus: 0,
    damageReduction: 0,
    speedBonus: 0,
    capacityBonus: 0,
    negotiationBonus: 0,
    mistakeChance: 0.05,
    fatigueReduction: 0,
  };
  
  const personalityInfo = PERSONALITY_INFO[clerk.personality];
  const specialtyInfo = SPECIALTY_INFO[clerk.specialty];
  
  if (personalityInfo.effects.rewardBonus) bonus.rewardBonus += personalityInfo.effects.rewardBonus;
  if (personalityInfo.effects.damageReduction) bonus.damageReduction += personalityInfo.effects.damageReduction;
  if (personalityInfo.effects.speedBonus) bonus.speedBonus += personalityInfo.effects.speedBonus;
  if (personalityInfo.effects.capacityBonus) bonus.capacityBonus += personalityInfo.effects.capacityBonus;
  if (personalityInfo.effects.negotiationBonus) bonus.negotiationBonus += personalityInfo.effects.negotiationBonus;
  if (personalityInfo.effects.mistakeChance) bonus.mistakeChance += personalityInfo.effects.mistakeChance;
  if (personalityInfo.effects.fatigueReduction) bonus.fatigueReduction += personalityInfo.effects.fatigueReduction;
  
  const specialtyMatch = specialtyInfo.bestAssignment === assignment;
  const specialtyMultiplier = specialtyMatch ? 1 : 0.3;
  
  if (specialtyInfo.effects.rewardBonus) bonus.rewardBonus += specialtyInfo.effects.rewardBonus * specialtyMultiplier;
  if (specialtyInfo.effects.damageReduction) bonus.damageReduction += specialtyInfo.effects.damageReduction * specialtyMultiplier;
  if (specialtyInfo.effects.speedBonus) bonus.speedBonus += specialtyInfo.effects.speedBonus * specialtyMultiplier;
  if (specialtyInfo.effects.capacityBonus) bonus.capacityBonus += specialtyInfo.effects.capacityBonus * specialtyMultiplier;
  if (specialtyInfo.effects.negotiationBonus) bonus.negotiationBonus += specialtyInfo.effects.negotiationBonus * specialtyMultiplier;
  if (specialtyInfo.effects.fatigueReduction) bonus.fatigueReduction += specialtyInfo.effects.fatigueReduction * specialtyMultiplier;
  
  clerk.abilities.forEach(ability => {
    if (ability.unlocked) {
      switch (ability.effect.type) {
        case 'reward_bonus': bonus.rewardBonus += ability.effect.value; break;
        case 'damage_reduction': bonus.damageReduction += ability.effect.value; break;
        case 'speed_bonus': bonus.speedBonus += ability.effect.value; break;
        case 'capacity_bonus': bonus.capacityBonus += ability.effect.value; break;
        case 'negotiation_bonus': bonus.negotiationBonus += ability.effect.value; break;
        case 'mistake_chance_reduction': bonus.mistakeChance -= ability.effect.value; break;
      }
    }
  });
  
  const levelBonus = (clerk.level - 1) * 0.02;
  bonus.rewardBonus += levelBonus;
  bonus.damageReduction += levelBonus * 0.5;
  
  bonus.mistakeChance = Math.max(0, Math.min(0.5, bonus.mistakeChance));
  
  return bonus;
};

export const calculateCombinedBonus = (clerks: Clerk[], assignment: ClerkAssignment): ClerkBonus => {
  const assignedClerks = clerks.filter(c => c.assignment === assignment && c.status !== 'resting' && c.status !== 'dismissed');
  
  const totalBonus: ClerkBonus = {
    rewardBonus: 0,
    damageReduction: 0,
    speedBonus: 0,
    capacityBonus: 0,
    negotiationBonus: 0,
    mistakeChance: 0,
    fatigueReduction: 0,
  };
  
  if (assignedClerks.length === 0) return totalBonus;
  
  assignedClerks.forEach(clerk => {
    const bonus = calculateClerkBonus(clerk, assignment);
    totalBonus.rewardBonus += bonus.rewardBonus;
    totalBonus.damageReduction += bonus.damageReduction;
    totalBonus.speedBonus += bonus.speedBonus;
    totalBonus.capacityBonus += bonus.capacityBonus;
    totalBonus.negotiationBonus += bonus.negotiationBonus;
    totalBonus.mistakeChance += bonus.mistakeChance;
    totalBonus.fatigueReduction += bonus.fatigueReduction;
  });
  
  totalBonus.mistakeChance = totalBonus.mistakeChance / assignedClerks.length;
  
  return totalBonus;
};

export const checkForMistake = (clerks: Clerk[], assignment: ClerkAssignment): { madeMistake: boolean; severity: 'minor' | 'moderate' | 'major'; clerk?: Clerk } => {
  const assignedClerks = clerks.filter(c => c.assignment === assignment && c.status !== 'resting' && c.status !== 'dismissed');
  
  for (const clerk of assignedClerks) {
    const fatigueRatio = clerk.fatigue / clerk.maxFatigue;
    const bonus = calculateClerkBonus(clerk, assignment);
    
    let mistakeChance = bonus.mistakeChance;
    
    if (fatigueRatio > 0.8) mistakeChance += 0.2;
    else if (fatigueRatio > 0.6) mistakeChance += 0.1;
    else if (fatigueRatio > 0.4) mistakeChance += 0.05;
    
    if (Math.random() < mistakeChance) {
      let severity: 'minor' | 'moderate' | 'major' = 'minor';
      if (fatigueRatio > 0.9) severity = 'major';
      else if (fatigueRatio > 0.7) severity = 'moderate';
      
      return { madeMistake: true, severity, clerk };
    }
  }
  
  return { madeMistake: false, severity: 'minor' };
};

export const addClerkExperience = (clerk: Clerk, experience: number): Clerk => {
  let updatedClerk = { ...clerk };
  updatedClerk.experience += experience;
  
  while (updatedClerk.experience >= updatedClerk.experienceToNextLevel && updatedClerk.level < 10) {
    updatedClerk.experience -= updatedClerk.experienceToNextLevel;
    updatedClerk.level += 1;
    updatedClerk.experienceToNextLevel = Math.floor(updatedClerk.experienceToNextLevel * 1.5);
    updatedClerk.maxFatigue += 10;
    
    updatedClerk.abilities = updatedClerk.abilities.map(ability => ({
      ...ability,
      unlocked: ability.unlocked || ability.requiredLevel <= updatedClerk.level,
    }));
  }
  
  return updatedClerk;
};

export const increaseClerkFatigue = (clerk: Clerk, amount: number): Clerk => {
  const bonus = calculateClerkBonus(clerk, clerk.assignment);
  const fatigueReduction = bonus.fatigueReduction;
  
  const abilityReduction = clerk.abilities
    .filter(a => a.unlocked && a.effect.type === 'fatigue_reduction')
    .reduce((sum, a) => sum + a.effect.value, 0);
  
  const totalReduction = fatigueReduction + abilityReduction;
  const actualAmount = Math.max(1, Math.floor(amount * (1 - totalReduction)));
  
  return {
    ...clerk,
    fatigue: Math.min(clerk.maxFatigue, clerk.fatigue + actualAmount),
  };
};

export const restClerk = (clerk: Clerk): Clerk => {
  const restAmount = Math.floor(clerk.maxFatigue * 0.5);
  return {
    ...clerk,
    fatigue: Math.max(0, clerk.fatigue - restAmount),
    status: 'available',
    assignment: 'idle',
  };
};

export const createInitialClerks = (): Clerk[] => [];

export const createInitialClerkCandidates = (): ClerkCandidate[] => generateClerkCandidates(4);
