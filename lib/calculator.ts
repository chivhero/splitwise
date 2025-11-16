// Алгоритм расчета долгов
import { Expense, Balance, Settlement, User } from '@/types';

/**
 * Рассчитывает балансы для каждого участника группы
 * Положительный баланс = вам должны
 * Отрицательный баланс = вы должны
 */
export function calculateBalances(expenses: Expense[], members: User[]): Balance[] {
  const balances: { [userId: string]: number } = {};
  
  // Инициализируем балансы
  members.forEach(member => {
    balances[member.id] = 0;
  });
  
  // Обрабатываем каждый расход
  expenses.forEach(expense => {
    const { amount, paidBy, splitBetween } = expense;
    const perPerson = amount / splitBetween.length;
    
    // Кто заплатил - получает баланс +
    balances[paidBy] = (balances[paidBy] || 0) + amount;
    
    // Все участники разделения получают баланс -
    splitBetween.forEach(userId => {
      balances[userId] = (balances[userId] || 0) - perPerson;
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












