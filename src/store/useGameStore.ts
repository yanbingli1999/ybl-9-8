import { create } from 'zustand';
import type {
  Player,
  Commission,
  Trip,
  PlayerVehicle,
  Warehouse,
  LedgerEntry,
  SaveGame,
  City,
  Route,
  Goods,
  Vehicle,
  Weather,
  GameEvent,
  ReputationGrade,
  Clerk,
  ClerkCandidate,
  ClerkAssignment,
  ClerkBonus,
} from '../../shared/types';
import { api } from '../services/api';
import {
  createInitialSaveGame,
  generateRandomCommissions,
  getRandomWeather,
  getRandomEvents,
  generateId,
  advanceTime,
  getCurrentDate,
  calculateWarehouseUsedSpace,
  calculateTotalGameHours,
  hireClerk as hireClerkLogic,
  restClerk as restClerkLogic,
  addClerkExperience,
  increaseClerkFatigue,
  calculateCombinedBonus,
  checkForMistake,
  generateClerkCandidates,
  getClerkTypeInfo,
} from '../utils/gameLogic';
import {
  calculateReputationGrade,
  settleTrip,
  generateLedgerEntries,
  calculateWarehouseCapacity,
  calculateWarehouseUpgradeCost,
  type TripSettlement,
} from '../utils/settlement';
import {
  calculateRouteTime,
  calculateLoad,
  calculateTripCost,
} from '../utils/routeCalc';

interface GameState {
  player: Player;
  commissions: Commission[];
  trips: Trip[];
  vehicles: PlayerVehicle[];
  warehouse: Warehouse;
  ledger: LedgerEntry[];
  clerks: Clerk[];
  clerkCandidates: ClerkCandidate[];
  lastClerkRefreshDay: number;
  currentWeather: Weather | null;
  selectedEscortClerkId: string | null;
  
  cities: City[];
  routes: Route[];
  goodsList: Goods[];
  vehicleTemplates: Vehicle[];
  weatherList: Weather[];
  eventsList: GameEvent[];
  
  selectedCommissions: string[];
  selectedVehicle: string | null;
  selectedRoute: string | null;
  currentSettlement: TripSettlement | null;
  showSettlement: boolean;
  currentEvent: GameEvent | null;
  showEvent: boolean;
  currentTripId: string | null;
  pendingEvents: GameEvent[];
  
  isLoading: boolean;
  isDispatching: boolean;
  error: string | null;
  
  loadGameData: () => Promise<void>;
  loadSaveGame: () => Promise<void>;
  saveGame: () => Promise<void>;
  newGame: () => void;
  
  generateDailyCommissions: () => void;
  acceptCommission: (commissionId: string) => boolean;
  selectCommission: (commissionId: string) => void;
  selectVehicle: (vehicleId: string) => void;
  selectRoute: (routeId: string) => void;
  selectEscortClerk: (clerkId: string | null) => void;
  
  startTrip: () => Promise<boolean>;
  processTripEvents: (tripId: string) => void;
  _processNextEvent: () => void;
  handleEventChoice: (choiceIndex: number) => void;
  completeTrip: (tripId: string) => void;
  closeSettlement: () => void;
  
  upgradeWarehouse: () => boolean;
  advanceTimeOfDay: () => void;
  
  updatePlayerGold: (amount: number) => void;
  updatePlayerReputation: (amount: number) => void;
  
  hireClerk: (candidateId: string) => boolean;
  dismissClerk: (clerkId: string) => void;
  assignClerk: (clerkId: string, assignment: ClerkAssignment) => void;
  restClerk: (clerkId: string) => void;
  refreshClerkCandidates: () => void;
  payClerkSalaries: () => void;
  
  getClerkBonuses: (assignment: ClerkAssignment) => ClerkBonus;
  getAvailableClerks: (assignment?: ClerkAssignment) => Clerk[];
  
  getAvailableVehicles: () => PlayerVehicle[];
  getAvailableRoutes: (destinationId: string) => Route[];
  getCurrentDate: () => string;
}

export const useGameStore = create<GameState>((set, get) => ({
  player: createInitialSaveGame().player,
  commissions: [],
  trips: [],
  vehicles: createInitialSaveGame().vehicles,
  warehouse: createInitialSaveGame().warehouse,
  ledger: [],
  clerks: createInitialSaveGame().clerks,
  clerkCandidates: createInitialSaveGame().clerkCandidates,
  lastClerkRefreshDay: createInitialSaveGame().lastClerkRefreshDay,
  currentWeather: null,
  selectedEscortClerkId: null,
  
  cities: [],
  routes: [],
  goodsList: [],
  vehicleTemplates: [],
  weatherList: [],
  eventsList: [],
  
  selectedCommissions: [],
  selectedVehicle: null,
  selectedRoute: null,
  currentSettlement: null,
  showSettlement: false,
  currentEvent: null,
  showEvent: false,
  currentTripId: null,
  pendingEvents: [],
  
  isLoading: false,
  isDispatching: false,
  error: null,
  
  loadGameData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.data.getAll();
      if (response.success && response.data) {
        const data = response.data as {
          cities: City[];
          routes: Route[];
          goods: Goods[];
          vehicles: Vehicle[];
          weather: Weather[];
          events: GameEvent[];
        };
        set({
          cities: data.cities,
          routes: data.routes,
          goodsList: data.goods,
          vehicleTemplates: data.vehicles,
          weatherList: data.weather,
          eventsList: data.events,
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadSaveGame: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.save.get();
      if (response.success && response.data) {
        const saveData = response.data as SaveGame;
        set({
          player: saveData.player,
          commissions: saveData.commissions,
          trips: saveData.trips,
          vehicles: saveData.vehicles,
          warehouse: saveData.warehouse,
          ledger: saveData.ledger,
          clerks: saveData.clerks || [],
          clerkCandidates: saveData.clerkCandidates || generateClerkCandidates(4),
          lastClerkRefreshDay: saveData.lastClerkRefreshDay || 1,
          currentWeather: saveData.currentWeatherId 
            ? get().weatherList.find(w => w.id === saveData.currentWeatherId) || null
            : null,
        });
      } else {
        get().newGame();
      }
    } catch (error) {
      set({ error: (error as Error).message });
      get().newGame();
    } finally {
      set({ isLoading: false });
    }
  },
  
  saveGame: async () => {
    const state = get();
    const saveData: SaveGame = {
      player: state.player,
      commissions: state.commissions,
      trips: state.trips,
      vehicles: state.vehicles,
      warehouse: state.warehouse,
      ledger: state.ledger,
      clerks: state.clerks,
      clerkCandidates: state.clerkCandidates,
      lastClerkRefreshDay: state.lastClerkRefreshDay,
      currentWeatherId: state.currentWeather?.id || 'sunny',
      savedAt: Date.now(),
    };
    
    try {
      await api.save.post(saveData);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  newGame: () => {
    const initial = createInitialSaveGame();
    const weatherList = get().weatherList;
    const weather = weatherList.length > 0 ? getRandomWeather(weatherList) : null;
    
    set({
      player: initial.player,
      commissions: [],
      trips: [],
      vehicles: initial.vehicles,
      warehouse: initial.warehouse,
      ledger: [],
      clerks: initial.clerks,
      clerkCandidates: initial.clerkCandidates,
      lastClerkRefreshDay: initial.lastClerkRefreshDay,
      currentWeather: weather,
      selectedEscortClerkId: null,
      selectedCommissions: [],
      selectedVehicle: null,
      selectedRoute: null,
      currentSettlement: null,
      showSettlement: false,
      currentEvent: null,
      showEvent: false,
      currentTripId: null,
      pendingEvents: [],
    });
    
    get().generateDailyCommissions();
  },
  
  generateDailyCommissions: () => {
    const state = get();
    const bonus = state.getClerkBonuses('reception');
    const qualityMultiplier = 1 + bonus.rewardBonus * 0.3;
    
    const newCommissions = generateRandomCommissions(
      state.goodsList,
      state.cities,
      state.player.reputationGrade,
      6
    ).map(c => ({
      ...c,
      reward: Math.floor(c.reward * (1 + bonus.rewardBonus * 0.5)),
    }));
    
    const existingIds = state.commissions.filter(c => !c.isAccepted).map(c => c.id);
    const filteredCommissions = state.commissions.filter(c => c.isAccepted || c.isCompleted);
    
    set({
      commissions: [...filteredCommissions, ...newCommissions],
    });
  },
  
  acceptCommission: (commissionId: string) => {
    const state = get();
    const commission = state.commissions.find(c => c.id === commissionId);
    if (!commission) return false;
    
    const goods = state.goodsList.find(g => g.id === commission.goodsId);
    if (!goods) return false;
    
    const warehouseBonus = state.getClerkBonuses('warehouse');
    const effectiveCapacity = Math.floor(state.warehouse.capacity * (1 + warehouseBonus.capacityBonus));
    
    const newLoad = commission.quantity * goods.weight;
    const currentLoad = calculateWarehouseUsedSpace(
      state.commissions,
      state.goodsList,
      state.trips
    );
    
    if (currentLoad + newLoad > effectiveCapacity) {
      set({ error: '仓库容量不足' });
      return false;
    }
    
    const bonus = state.getClerkBonuses('reception');
    const mistakeResult = checkForMistake(state.clerks, 'reception');
    
    let finalReward = Math.floor(commission.reward * (1 + bonus.rewardBonus));
    let reputationChange = 0;
    let mistakeDescription = '';
    
    if (mistakeResult.madeMistake && mistakeResult.clerk) {
      const mistakeClerk = mistakeResult.clerk;
      switch (mistakeResult.severity) {
        case 'minor':
          finalReward = Math.floor(finalReward * 0.95);
          reputationChange = -2;
          mistakeDescription = `${mistakeClerk.name}在记录订单时犯了小错，佣金减少5%`;
          break;
        case 'moderate':
          finalReward = Math.floor(finalReward * 0.85);
          reputationChange = -5;
          mistakeDescription = `${mistakeClerk.name}在谈判时出了差错，佣金减少15%`;
          break;
        case 'major':
          finalReward = Math.floor(finalReward * 0.7);
          reputationChange = -10;
          mistakeDescription = `${mistakeClerk.name}犯了严重错误，客户非常不满，佣金减少30%`;
          break;
      }
      
      const updatedClerk = addClerkExperience(mistakeClerk, 5);
      updatedClerk.totalMistakes += 1;
      updatedClerk.performanceScore = Math.max(0, updatedClerk.performanceScore - 5);
      set({
        clerks: state.clerks.map(c => c.id === mistakeClerk.id ? updatedClerk : c),
      });
      
      if (mistakeDescription) {
        set({ error: mistakeDescription });
      }
    }
    
    const workingClerks = state.clerks.filter(c => c.assignment === 'reception' && c.status !== 'resting');
    const updatedClerks = state.clerks.map(c => {
      if (c.assignment === 'reception' && c.status !== 'resting') {
        let updated = increaseClerkFatigue(c, 8);
        updated = addClerkExperience(updated, 10);
        updated.totalTasksCompleted += 1;
        updated.performanceScore = Math.min(100, updated.performanceScore + 1);
        return updated;
      }
      return c;
    });
    
    const acceptedGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
    
    const updatedCommissions = state.commissions.map(c =>
      c.id === commissionId ? {
        ...c,
        isAccepted: true,
        reward: finalReward,
        acceptedAt: Date.now(),
        acceptedGameHours,
      } : c
    );
    
    const usedSpace = currentLoad + newLoad;
    
    let newReputation = state.player.reputation + reputationChange;
    const repInfo = calculateReputationGrade(Math.max(0, newReputation));
    
    set({
      commissions: updatedCommissions,
      warehouse: { ...state.warehouse, usedSpace },
      clerks: updatedClerks,
      player: {
        ...state.player,
        reputation: Math.max(0, newReputation),
        reputationGrade: repInfo.grade as ReputationGrade,
        priceBonus: repInfo.priceBonus,
      },
    });
    
    return true;
  },
  
  selectCommission: (commissionId: string) => {
    const state = get();
    const commission = state.commissions.find(c => c.id === commissionId);
    if (!commission || commission.isShipped || commission.isCompleted) {
      return;
    }
    
    const selected = state.selectedCommissions;
    let newSelected: string[];
    
    if (selected.includes(commissionId)) {
      newSelected = selected.filter(id => id !== commissionId);
    } else {
      newSelected = [...selected, commissionId];
    }
    
    set({ selectedCommissions: newSelected });
  },
  
  selectVehicle: (vehicleId: string) => {
    set({ selectedVehicle: vehicleId });
  },
  
  selectRoute: (routeId: string) => {
    set({ selectedRoute: routeId });
  },
  
  selectEscortClerk: (clerkId: string | null) => {
    set({ selectedEscortClerkId: clerkId });
  },
  
  startTrip: async () => {
    if (get().isDispatching) return false;
    set({ isDispatching: true });
    
    try {
      const state = get();
      const { selectedCommissions, selectedVehicle, selectedRoute, selectedEscortClerkId } = state;
      
      if (selectedCommissions.length === 0) {
        set({ error: '请选择要运输的货物' });
        return false;
      }
      if (!selectedVehicle) {
        set({ error: '请选择运输车辆' });
        return false;
      }
      if (!selectedRoute) {
        set({ error: '请选择运输路线' });
        return false;
      }
      
      const vehicle = state.vehicles.find(v => v.id === selectedVehicle);
      const route = state.routes.find(r => r.id === selectedRoute);
      const weather = state.currentWeather || state.weatherList[0];
      const escortClerk = selectedEscortClerkId ? state.clerks.find(c => c.id === selectedEscortClerkId) : null;
      
      if (!vehicle || !route) return false;
      
      if (!vehicle.isAvailable) {
        set({ error: '该车辆已在使用中' });
        return false;
      }
      
      if (escortClerk && (escortClerk.status === 'resting' || escortClerk.status === 'dismissed')) {
        set({ error: '所选伙计无法出车' });
        return false;
      }
      
      const commissions = state.commissions.filter(
        c => selectedCommissions.includes(c.id)
      );
      
      const hasShipped = commissions.some(c => c.isShipped || c.isCompleted);
      if (hasShipped) {
        set({ error: '部分货物已派送，请重新选择' });
        return false;
      }
      
      const activeTrips = state.trips.filter(t => t.status === 'in_progress');
      const alreadyInOtherTrip = commissions.some(c =>
        activeTrips.some(t => t.commissionIds.includes(c.id))
      );
      if (alreadyInOtherTrip) {
        set({ error: '部分货物已在其他运输中，请重新选择' });
        return false;
      }
      
      const loadCalc = calculateLoad(vehicle, commissions, state.goodsList);
      if (loadCalc.isOverloaded) {
        set({ error: '车辆超载，请减少货物或更换更大的车辆' });
        return false;
      }
      
      const escortBonus = escortClerk ? calculateCombinedBonus([escortClerk], 'escort') : null;
      
      const adjustedWeather = escortBonus ? {
        ...weather,
        speedModifier: weather.speedModifier + escortBonus.speedBonus,
        damageChance: Math.max(0, weather.damageChance - escortBonus.damageReduction),
      } : weather;
      
      const routeCalc = calculateRouteTime(route, vehicle, adjustedWeather);
      const tripCost = calculateTripCost(route, vehicle, routeCalc.totalTime);
      
      if (state.player.gold < tripCost) {
        set({ error: '金币不足，无法支付运输费用' });
        return false;
      }
      
      const departureGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
      const etaGameHours = departureGameHours + routeCalc.totalTime;
      
      const tripId = generateId();
      const trip: Trip = {
        id: tripId,
        vehicleId: selectedVehicle,
        routeId: selectedRoute,
        commissionIds: selectedCommissions,
        status: 'in_progress',
        progress: 0,
        departureTime: Date.now(),
        departureGameHours,
        eta: Date.now() + routeCalc.totalTime * 3600 * 1000,
        etaGameHours,
        currentDamage: 0,
        weatherId: weather.id,
        events: [],
        eventEffects: [],
        totalCost: tripCost,
      };
      
      if (escortClerk) {
        trip.eventEffects.push({
          title: '随车伙计',
          effect: {
            type: 'hint',
            value: `${escortClerk.name}随车押运`,
            description: `${getClerkTypeInfo(escortClerk.type).name}${escortClerk.name}负责此次押运`,
          },
        });
      }
      
      const updatedVehicles = state.vehicles.map(v =>
        v.id === selectedVehicle ? { ...v, isAvailable: false } : v
      );
      
      let updatedClerks = state.clerks;
      if (escortClerk) {
        updatedClerks = state.clerks.map(c =>
          c.id === selectedEscortClerkId ? {
            ...c,
            status: 'working',
            assignment: 'escort',
            assignedTripId: tripId,
          } : c
        );
      }
      
      const shippedGameHours = departureGameHours;
      const updatedCommissions = state.commissions.map(c =>
        selectedCommissions.includes(c.id) ? {
          ...c,
          isShipped: true,
          shippedAt: Date.now(),
          shippedGameHours,
        } : c
      );
      
      set({
        trips: [...state.trips, trip],
        vehicles: updatedVehicles,
        commissions: updatedCommissions,
        clerks: updatedClerks,
        selectedCommissions: [],
        selectedVehicle: null,
        selectedRoute: null,
        selectedEscortClerkId: null,
      });
      
      await get().saveGame();
      return true;
    } finally {
      set({ isDispatching: false });
    }
  },
  
  processTripEvents: (tripId: string) => {
    const state = get();
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip || trip.status !== 'in_progress') return;
    
    const route = state.routes.find(r => r.id === trip.routeId);
    if (!route) return;
    
    const allEvents = getRandomEvents(state.eventsList, route.type, 2);
    
    set({
      currentTripId: tripId,
      pendingEvents: allEvents,
    });
    
    get()._processNextEvent();
  },
  
  _processNextEvent: () => {
    const state = get();
    const { pendingEvents, currentTripId } = state;
    
    if (!currentTripId) return;
    
    if (pendingEvents.length > 0) {
      const [nextEvent, ...rest] = pendingEvents;
      set({
        currentEvent: nextEvent,
        showEvent: true,
        pendingEvents: rest,
      });
    } else {
      set({
        currentEvent: null,
        showEvent: false,
        pendingEvents: [],
      });
      setTimeout(() => {
        get().completeTrip(currentTripId);
      }, 300);
    }
  },
  
  handleEventChoice: (choiceIndex: number) => {
    const state = get();
    const event = state.currentEvent;
    const tripId = state.currentTripId;
    if (!event || !tripId) return;
    
    const effect = event.effects[choiceIndex];
    const trip = state.trips.find(t => t.id === tripId);
    
    if (!trip || !effect) {
      set({
        currentEvent: null,
        showEvent: false,
      });
      get()._processNextEvent();
      return;
    }
    
    const eventEffect = {
      title: event.title,
      effect: { ...effect },
    };
    
    const updatedTrips = state.trips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          events: [...t.events, `${event.title}: ${effect.description}`],
          eventEffects: [...t.eventEffects, eventEffect],
        };
      }
      return t;
    });
    
    let updatedPlayer = { ...state.player };
    const newLedgerEntries: LedgerEntry[] = [...state.ledger];
    
    if (effect.type === 'gold') {
      const goldValue = effect.value as number;
      updatedPlayer.gold += goldValue;
      
      newLedgerEntries.push({
        id: generateId(),
        type: goldValue >= 0 ? 'income' : 'expense',
        description: `${event.title}: ${effect.description}`,
        amount: Math.abs(goldValue),
        date: getCurrentDate(state.player.currentDay),
        day: state.player.currentDay,
        category: '事件',
        createdAt: Date.now(),
      });
    }
    
    if (effect.type === 'reputation') {
      const repValue = effect.value as number;
      updatedPlayer.reputation = Math.max(0, Math.min(1000,
        updatedPlayer.reputation + repValue
      ));
      const repInfo = calculateReputationGrade(updatedPlayer.reputation);
      updatedPlayer.reputationGrade = repInfo.grade as ReputationGrade;
      updatedPlayer.priceBonus = repInfo.priceBonus;
    }
    
    set({
      trips: updatedTrips,
      player: updatedPlayer,
      ledger: newLedgerEntries,
      currentEvent: null,
      showEvent: false,
    });
    
    if (effect.type === 'gold') {
      const ledgerEntry = newLedgerEntries[newLedgerEntries.length - 1];
      api.ledger.post(ledgerEntry);
    }
    
    setTimeout(() => {
      get()._processNextEvent();
    }, 300);
  },
  
  completeTrip: (tripId: string) => {
    const state = get();
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) return;
    
    const vehicle = state.vehicles.find(v => v.id === trip.vehicleId);
    const route = state.routes.find(r => r.id === trip.routeId);
    const weather = state.weatherList.find(w => w.id === trip.weatherId) || state.weatherList[0];
    
    if (!vehicle || !route) return;
    
    const commissions = state.commissions.filter(
      c => trip.commissionIds.includes(c.id)
    );
    
    const loadCalc = calculateLoad(vehicle, commissions, state.goodsList);
    
    const escortClerk = state.clerks.find(c => c.assignedTripId === tripId);
    let escortBonus = null;
    if (escortClerk) {
      escortBonus = calculateCombinedBonus([escortClerk], 'escort');
    }
    
    const routeCalc = calculateRouteTime(route, vehicle, weather);
    
    const adjustedPriceBonus = state.player.priceBonus + (escortBonus?.negotiationBonus || 0);
    
    const settlement = settleTrip(
      trip,
      commissions,
      state.goodsList,
      weather,
      route.condition,
      loadCalc.isOverloaded,
      trip.eventEffects,
      adjustedPriceBonus,
      routeCalc.totalTime
    );
    
    if (escortBonus && escortBonus.damageReduction > 0) {
      settlement.totalProfit += Math.floor(settlement.totalProfit * escortBonus.damageReduction * 0.5);
      settlement.totalIncome = Math.floor(settlement.totalIncome * (1 + escortBonus.rewardBonus * 0.3));
      settlement.totalProfit = settlement.totalIncome - settlement.totalExpense;
    }
    
    if (escortClerk) {
      settlement.escortClerkId = escortClerk.id;
    }
    
    const mistakeResult = escortClerk ? checkForMistake([escortClerk], 'escort') : { madeMistake: false, severity: 'minor' as const };
    let mistakeDescription = '';
    
    if (mistakeResult.madeMistake && mistakeResult.clerk) {
      switch (mistakeResult.severity) {
        case 'minor':
          settlement.totalProfit = Math.floor(settlement.totalProfit * 0.95);
          mistakeDescription = `${mistakeResult.clerk.name}在押运时疏忽，导致轻微损失`;
          break;
        case 'moderate':
          settlement.totalProfit = Math.floor(settlement.totalProfit * 0.85);
          settlement.reputationChange -= 3;
          mistakeDescription = `${mistakeResult.clerk.name}在运输途中出了差错，导致部分货物受损`;
          break;
        case 'major':
          settlement.totalProfit = Math.floor(settlement.totalProfit * 0.7);
          settlement.reputationChange -= 8;
          mistakeDescription = `${mistakeResult.clerk.name}犯了严重错误，货物遭受重大损失`;
          break;
      }
    }
    
    const ledgerEntries = generateLedgerEntries(
      settlement,
      state.player.currentDay,
      getCurrentDate(state.player.currentDay)
    ).map(e => ({ ...e, id: generateId(), createdAt: Date.now() }));
    
    if (mistakeDescription) {
      ledgerEntries.push({
        id: generateId(),
        type: 'expense',
        description: mistakeDescription,
        amount: Math.floor(settlement.totalIncome * 0.05),
        date: getCurrentDate(state.player.currentDay),
        day: state.player.currentDay,
        category: '伙计失误',
        createdAt: Date.now(),
      });
    }
    
    const arrivalGameHours = calculateTotalGameHours(state.player.currentDay, state.player.timeOfDay);
    const updatedCommissions = state.commissions.map(c => {
      if (trip.commissionIds.includes(c.id)) {
        return {
          ...c,
          isCompleted: true,
          completedAt: Date.now(),
        };
      }
      return c;
    });
    
    const updatedVehicles = state.vehicles.map(v =>
      v.id === trip.vehicleId ? { ...v, isAvailable: true } : v
    );
    
    let updatedClerks = state.clerks;
    if (escortClerk) {
      updatedClerks = state.clerks.map(c => {
        if (c.id === escortClerk.id) {
          let updated = increaseClerkFatigue(c, Math.floor(routeCalc.totalTime * 2));
          const expGain = Math.floor(settlement.totalProfit / 100) + 20;
          updated = addClerkExperience(updated, expGain);
          updated.totalTasksCompleted += 1;
          updated.assignedTripId = undefined;
          updated.status = 'available';
          updated.assignment = 'idle';
          
          if (mistakeResult.madeMistake && mistakeResult.clerk?.id === c.id) {
            updated.totalMistakes += 1;
            updated.performanceScore = Math.max(0, updated.performanceScore - 10);
          } else {
            updated.performanceScore = Math.min(100, updated.performanceScore + 3);
          }
          
          return updated;
        }
        return c;
      });
    }
    
    const warehouseClerks = state.clerks.filter(c => c.assignment === 'warehouse' && c.status !== 'resting');
    if (warehouseClerks.length > 0) {
      updatedClerks = updatedClerks.map(c => {
        if (c.assignment === 'warehouse' && c.status !== 'resting') {
          let updated = increaseClerkFatigue(c, 5);
          updated = addClerkExperience(updated, 8);
          updated.totalTasksCompleted += 1;
          updated.performanceScore = Math.min(100, updated.performanceScore + 1);
          return updated;
        }
        return c;
      });
    }
    
    const updatedTrips = state.trips.map(t =>
      t.id === tripId ? {
        ...t,
        status: 'completed' as const,
        actualArrivalTime: Date.now(),
        actualArrivalGameHours: arrivalGameHours,
      } : t
    );
    
    const newReputation = Math.max(0, Math.min(1000, 
      state.player.reputation + settlement.reputationChange
    ));
    const repInfo = calculateReputationGrade(newReputation);
    
    const warehouseBonus = state.getClerkBonuses('warehouse');
    
    const usedSpace = calculateWarehouseUsedSpace(
      updatedCommissions,
      state.goodsList,
      updatedTrips
    );
    
    set({
      player: {
        ...state.player,
        gold: state.player.gold + settlement.totalProfit,
        reputation: newReputation,
        reputationGrade: repInfo.grade as ReputationGrade,
        priceBonus: repInfo.priceBonus,
      },
      commissions: updatedCommissions,
      vehicles: updatedVehicles,
      trips: updatedTrips,
      ledger: [...state.ledger, ...ledgerEntries],
      clerks: updatedClerks,
      warehouse: { ...state.warehouse, usedSpace },
      currentSettlement: settlement,
      showSettlement: true,
      currentTripId: null,
      pendingEvents: [],
    });
    
    api.ledger.postBatch(ledgerEntries);
    get().saveGame();
  },
  
  closeSettlement: () => {
    set({ showSettlement: false, currentSettlement: null });
  },
  
  upgradeWarehouse: () => {
    const state = get();
    const { warehouse, player } = state;
    
    if (player.gold < warehouse.upgradeCost) {
      set({ error: '金币不足，无法升级仓库' });
      return false;
    }
    
    const newLevel = warehouse.level + 1;
    const newCapacity = calculateWarehouseCapacity(newLevel);
    const newUpgradeCost = calculateWarehouseUpgradeCost(newLevel);
    
    const ledgerEntry: LedgerEntry = {
      id: generateId(),
      type: 'expense',
      description: `仓库升级到 Lv.${newLevel}`,
      amount: warehouse.upgradeCost,
      date: getCurrentDate(player.currentDay),
      day: player.currentDay,
      category: '升级',
      createdAt: Date.now(),
    };
    
    set({
      warehouse: {
        ...warehouse,
        level: newLevel,
        capacity: newCapacity,
        upgradeCost: newUpgradeCost,
      },
      player: {
        ...player,
        gold: player.gold - warehouse.upgradeCost,
      },
      ledger: [...state.ledger, ledgerEntry],
    });
    
    api.ledger.post(ledgerEntry);
    get().saveGame();
    
    return true;
  },
  
  advanceTimeOfDay: () => {
    const state = get();
    const newPlayer = advanceTime(state.player);
    
    let weather = state.currentWeather;
    let newClerks = state.clerks;
    let newCandidates = state.clerkCandidates;
    let newLastRefresh = state.lastClerkRefreshDay;
    let newLedger = [...state.ledger];
    let errorMessage: string | null = null;
    
    if (newPlayer.timeOfDay === 'morning') {
      weather = getRandomWeather(state.weatherList);
      get().generateDailyCommissions();
      
      if (newPlayer.currentDay !== state.player.currentDay) {
        const activeClerks = state.clerks.filter(c => c.status !== 'dismissed');
        const totalSalary = activeClerks.reduce((sum, c) => sum + c.salary, 0);
        
        if (totalSalary > 0) {
          let actualSalaryPaid = 0;
          
          if (newPlayer.gold >= totalSalary) {
            newPlayer.gold -= totalSalary;
            actualSalaryPaid = totalSalary;
          } else {
            actualSalaryPaid = Math.max(0, newPlayer.gold);
            newPlayer.gold = 0;
            
            const unpaidRatio = (totalSalary - actualSalaryPaid) / totalSalary;
            
            errorMessage = `金币不足！仅支付了 ${actualSalaryPaid}/${totalSalary} 金币薪水，部分伙计士气下降！`;
            
            newClerks = newClerks.map(c => {
              if (c.status !== 'dismissed') {
                let updated = { ...c };
                updated.performanceScore = Math.max(0, updated.performanceScore - Math.floor(unpaidRatio * 30));
                
                if (updated.performanceScore < 20 && Math.random() < unpaidRatio * 0.5) {
                  updated.status = 'dismissed';
                }
                return updated;
              }
              return c;
            });
          }
          
          const salaryEntry: LedgerEntry = {
            id: generateId(),
            type: 'expense',
            description: `伙计薪水 (${activeClerks.length}人)`,
            amount: actualSalaryPaid,
            date: getCurrentDate(newPlayer.currentDay),
            day: newPlayer.currentDay,
            category: '人力',
            createdAt: Date.now(),
          };
          newLedger.push(salaryEntry);
          api.ledger.post(salaryEntry);
          
          newClerks = newClerks.map(c => {
            if (c.status !== 'dismissed') {
              let updated = { ...c, daysEmployed: c.daysEmployed + 1 };
              updated = addClerkExperience(updated, 2);
              return updated;
            }
            return c;
          });
        }
        
        if (newPlayer.currentDay - state.lastClerkRefreshDay >= 3) {
          newCandidates = generateClerkCandidates(4);
          newLastRefresh = newPlayer.currentDay;
        }
      }
    }
    
    set({
      player: newPlayer,
      currentWeather: weather,
      clerks: newClerks,
      clerkCandidates: newCandidates,
      lastClerkRefreshDay: newLastRefresh,
      ledger: newLedger,
      error: errorMessage,
    });
    
    get().saveGame();
  },
  
  updatePlayerGold: (amount: number) => {
    set(state => ({
      player: { ...state.player, gold: state.player.gold + amount },
    }));
  },
  
  updatePlayerReputation: (amount: number) => {
    set(state => {
      const newRep = Math.max(0, Math.min(1000, state.player.reputation + amount));
      const repInfo = calculateReputationGrade(newRep);
      return {
        player: {
          ...state.player,
          reputation: newRep,
          reputationGrade: repInfo.grade as ReputationGrade,
          priceBonus: repInfo.priceBonus,
        },
      };
    });
  },
  
  getAvailableVehicles: () => {
    return get().vehicles.filter(v => v.isAvailable);
  },
  
  getAvailableRoutes: (destinationId: string) => {
    const state = get();
    return state.routes.filter(
      r => 
        (r.fromCityId === 'yuegang' && r.toCityId === destinationId) ||
        (r.fromCityId === destinationId && r.toCityId === 'yuegang')
    );
  },
  
  getCurrentDate: () => {
    return getCurrentDate(get().player.currentDay);
  },
  
  hireClerk: (candidateId: string) => {
    const state = get();
    const candidate = state.clerkCandidates.find(c => c.id === candidateId);
    if (!candidate) return false;
    
    const currentClerks = state.clerks.filter(c => c.status !== 'dismissed').length;
    const maxClerks = 8;
    if (currentClerks >= maxClerks) {
      set({ error: `伙计数量已达上限 (${currentClerks}/${maxClerks})` });
      return false;
    }
    
    if (state.player.gold < candidate.salary * 3) {
      set({ error: '金币不足，无法支付招募费用' });
      return false;
    }
    
    const newClerk = hireClerkLogic(candidate);
    
    const hireFee = candidate.salary * 3;
    const newLedgerEntry: LedgerEntry = {
      id: generateId(),
      type: 'expense',
      description: `招募 ${newClerk.name} (${getClerkTypeInfo(candidate.type).name})`,
      amount: hireFee,
      date: getCurrentDate(state.player.currentDay),
      day: state.player.currentDay,
      category: '招募',
      createdAt: Date.now(),
    };
    
    set({
      clerks: [...state.clerks, newClerk],
      clerkCandidates: state.clerkCandidates.filter(c => c.id !== candidateId),
      player: { ...state.player, gold: state.player.gold - hireFee },
      ledger: [...state.ledger, newLedgerEntry],
    });
    
    api.ledger.post(newLedgerEntry);
    get().saveGame();
    
    return true;
  },
  
  dismissClerk: (clerkId: string) => {
    const state = get();
    const clerk = state.clerks.find(c => c.id === clerkId);
    if (!clerk) return;
    
    if (clerk.status === 'working' && clerk.assignedTripId) {
      set({ error: '该伙计正在工作中，无法解雇' });
      return;
    }
    
    const severancePay = Math.floor(clerk.salary * 2);
    const newLedgerEntry: LedgerEntry = {
      id: generateId(),
      type: 'expense',
      description: `解雇 ${clerk.name} 遣散费`,
      amount: severancePay,
      date: getCurrentDate(state.player.currentDay),
      day: state.player.currentDay,
      category: '人力',
      createdAt: Date.now(),
    };
    
    set({
      clerks: state.clerks.map(c =>
        c.id === clerkId ? { ...c, status: 'dismissed' } : c
      ),
      player: { ...state.player, gold: Math.max(0, state.player.gold - severancePay) },
      ledger: [...state.ledger, newLedgerEntry],
    });
    
    api.ledger.post(newLedgerEntry);
    get().saveGame();
  },
  
  assignClerk: (clerkId: string, assignment: ClerkAssignment) => {
    const state = get();
    const clerk = state.clerks.find(c => c.id === clerkId);
    if (!clerk || clerk.status === 'dismissed') return;
    
    if (clerk.status === 'working' && clerk.assignedTripId) {
      set({ error: '该伙计正在工作中' });
      return;
    }
    
    set({
      clerks: state.clerks.map(c =>
        c.id === clerkId ? { ...c, assignment, status: assignment === 'idle' ? 'available' : 'working' } : c
      ),
    });
    
    get().saveGame();
  },
  
  restClerk: (clerkId: string) => {
    const state = get();
    const clerk = state.clerks.find(c => c.id === clerkId);
    if (!clerk || clerk.status === 'dismissed') return;
    
    if (clerk.status === 'working' && clerk.assignedTripId) {
      set({ error: '该伙计正在工作中，无法休息' });
      return;
    }
    
    set({
      clerks: state.clerks.map(c =>
        c.id === clerkId ? restClerkLogic(c) : c
      ),
    });
    
    get().saveGame();
  },
  
  refreshClerkCandidates: () => {
    const state = get();
    const refreshCost = 50;
    
    if (state.player.gold < refreshCost) {
      set({ error: '金币不足' });
      return;
    }
    
    const newLedgerEntry: LedgerEntry = {
      id: generateId(),
      type: 'expense',
      description: '刷新候选名单',
      amount: refreshCost,
      date: getCurrentDate(state.player.currentDay),
      day: state.player.currentDay,
      category: '招募',
      createdAt: Date.now(),
    };
    
    set({
      clerkCandidates: generateClerkCandidates(4),
      lastClerkRefreshDay: state.player.currentDay,
      player: { ...state.player, gold: state.player.gold - refreshCost },
      ledger: [...state.ledger, newLedgerEntry],
    });
    
    api.ledger.post(newLedgerEntry);
    get().saveGame();
  },
  
  payClerkSalaries: () => {
    const state = get();
    const activeClerks = state.clerks.filter(c => c.status !== 'dismissed');
    const totalSalary = activeClerks.reduce((sum, c) => sum + c.salary, 0);
    
    if (totalSalary === 0) {
      set({ error: '没有需要支付薪水的伙计' });
      return;
    }
    
    if (state.player.gold < totalSalary) {
      set({ error: '金币不足，无法支付薪水' });
      return;
    }
    
    const newLedgerEntry: LedgerEntry = {
      id: generateId(),
      type: 'expense',
      description: `提前支付伙计薪水 (${activeClerks.length}人)`,
      amount: totalSalary,
      date: getCurrentDate(state.player.currentDay),
      day: state.player.currentDay,
      category: '人力',
      createdAt: Date.now(),
    };
    
    set({
      player: { ...state.player, gold: state.player.gold - totalSalary },
      ledger: [...state.ledger, newLedgerEntry],
    });
    
    api.ledger.post(newLedgerEntry);
    get().saveGame();
  },
  
  getClerkBonuses: (assignment: ClerkAssignment) => {
    return calculateCombinedBonus(get().clerks, assignment);
  },
  
  getAvailableClerks: (assignment?: ClerkAssignment) => {
    const state = get();
    let clerks = state.clerks.filter(c => c.status !== 'dismissed' && !c.assignedTripId);
    if (assignment) {
      clerks = clerks.filter(c => c.assignment === assignment || c.assignment === 'idle');
    }
    return clerks;
  },
}));
