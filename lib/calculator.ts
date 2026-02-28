// Алгоритм расчета долгов
import { Expense, Balance, Settlement, User } from '@/types';

/**
 * Рассчитывает долю каждого участника в расходе
 * Поддерживает как равное разделение, так и custom split (по долям)
 */
export function calculateExpenseShares(expense: Expense): Record<string, number> {
  const { amount, splitBetween, splitType, customSplits } = expense;
  const shares: Record<string, number> = {};
  
  if (splitType === 'equal') {
    // Равное разделение (старое поведение)
    const perPerson = amount / splitBetween.length;
    splitBetween.forEach(userId => {
      shares[userId] = perPerson;
    });
  } else if (splitType === 'custom' && customSplits) {
    // Неравномерное разделение по долям
    // Считаем общее количество долей
    const totalShares = Object.values(customSplits).reduce((sum, count) => sum + count, 0);
    
    if (totalShares === 0) {
      throw new Error('Total shares cannot be zero');
    }
    
    // Цена одной доли
    const pricePerShare = amount / totalShares;
    
    // Рассчитываем сумму для каждого участника
    splitBetween.forEach(userId => {
      const userShares = customSplits[userId] || 0;
      shares[userId] = pricePerShare * userShares;
    });
  } else {
    // Fallback на равное разделение если что-то пошло не так
    const perPerson = amount / splitBetween.length;
    splitBetween.forEach(userId => {
      shares[userId] = perPerson;
    });
  }
  
  return shares;
}

/**
 * Рассчитывает балансы для каждого участника группы
 * Положительный баланс = вам должны
 * Отрицательный баланс = вы должны
 * 
 * Теперь поддерживает как равное разделение, так и custom split
 */
export function calculateBalances(expenses: Expense[], members: User[]): Balance[] {
  const balances: { [userId: string]: number } = {};
  
  // Инициализируем балансы
  members.forEach(member => {
    balances[member.id] = 0;
  });
  
  // Обрабатываем каждый расход
  expenses.forEach(expense => {
    const { amount, paidBy } = expense;
    
    // Кто заплатил - получает баланс +
    balances[paidBy] = (balances[paidBy] || 0) + amount;
    
    // Рассчитываем долю каждого участника (с учётом типа разделения)
    const shares = calculateExpenseShares(expense);
    
    // Все участники разделения получают баланс -
    Object.entries(shares).forEach(([userId, shareAmount]) => {
      balances[userId] = (balances[userId] || 0) - shareAmount;
    });
  });
  
  // Конвертируем в массив
  return Object.entries(balances).map(([userId, balance]) => ({
    userId,
    balance: Math.round(balance * 100) / 100, // округляем до 2 знаков
    user: members.find(m => m.id === userId),
  }));
}

/**
 * Минимизирует количество транзакций между участниками
 * Используем алгоритм "жадного решения" для упрощения расчетов
 */
export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Разделяем на должников и кредиторов
  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);
  
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);
  
  let i = 0;
  let j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.balance, creditor.balance);
    
    if (amount > 0.01) {
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount * 100) / 100,
        fromUser: debtor.user,
        toUser: creditor.user,
      });
    }
    
    debtor.balance -= amount;
    creditor.balance -= amount;
    
    if (debtor.balance < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }
  
  return settlements;
}

/**
 * Получить сводку по группе
 */
export function getGroupSummary(expenses: Expense[], members: User[]) {
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balances = calculateBalances(expenses, members);
  const settlements = calculateSettlements(balances);
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    expensesCount: expenses.length,
    balances,
    settlements,
  };
}















