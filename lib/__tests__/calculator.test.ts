import { calculateBalances, calculateSettlements, getGroupSummary } from '../calculator';
import { Expense, User } from '@/types';

describe('calculator', () => {
  // Тестовые данные
  const users: User[] = [
    { id: 'user1', name: 'Алиса', username: 'alice' },
    { id: 'user2', name: 'Боб', username: 'bob' },
    { id: 'user3', name: 'Виктор', username: 'victor' },
  ];

  describe('calculateBalances', () => {
    it('должен правильно рассчитывать балансы для простого случая', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Ужин',
          amount: 300,
          paidBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'food',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const balances = calculateBalances(expenses, users);

      // Алиса заплатила 300, но должна только 100 (300/3)
      // Итого: +200
      expect(balances.find(b => b.userId === 'user1')?.balance).toBe(200);
      
      // Боб не платил, но должен 100
      expect(balances.find(b => b.userId === 'user2')?.balance).toBe(-100);
      
      // Виктор не платил, но должен 100
      expect(balances.find(b => b.userId === 'user3')?.balance).toBe(-100);
    });

    it('должен обрабатывать несколько расходов', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Ужин',
          amount: 300,
          paidBy: 'user1', // Алиса платит 300
          splitBetween: ['user1', 'user2', 'user3'], // делят на троих
          category: 'food',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'exp2',
          groupId: 'group1',
          description: 'Такси',
          amount: 150,
          paidBy: 'user2', // Боб платит 150
          splitBetween: ['user1', 'user2', 'user3'], // делят на троих
          category: 'transport',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const balances = calculateBalances(expenses, users);

      // Алиса: заплатила 300, должна 150 (300+150)/3 = 150
      expect(balances.find(b => b.userId === 'user1')?.balance).toBe(150);
      
      // Боб: заплатил 150, должен 150
      expect(balances.find(b => b.userId === 'user2')?.balance).toBe(0);
      
      // Виктор: ничего не платил, должен 150
      expect(balances.find(b => b.userId === 'user3')?.balance).toBe(-150);
    });

    it('должен обрабатывать расходы с разным количеством участников', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Обед вдвоем',
          amount: 200,
          paidBy: 'user1',
          splitBetween: ['user1', 'user2'], // только двое
          category: 'food',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const balances = calculateBalances(expenses, users);

      expect(balances.find(b => b.userId === 'user1')?.balance).toBe(100);
      expect(balances.find(b => b.userId === 'user2')?.balance).toBe(-100);
      expect(balances.find(b => b.userId === 'user3')?.balance).toBe(0); // не участвовал
    });

    it('должен округлять балансы до 2 знаков', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Тест',
          amount: 100,
          paidBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'other',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const balances = calculateBalances(expenses, users);

      // 100/3 = 33.333... должно округлиться до 33.33
      expect(balances.find(b => b.userId === 'user1')?.balance).toBe(66.67);
      expect(balances.find(b => b.userId === 'user2')?.balance).toBe(-33.33);
      expect(balances.find(b => b.userId === 'user3')?.balance).toBe(-33.33);
    });
  });

  describe('calculateSettlements', () => {
    it('должен минимизировать количество транзакций', () => {
      const balances = [
        { userId: 'user1', balance: 200, user: users[0] },
        { userId: 'user2', balance: -100, user: users[1] },
        { userId: 'user3', balance: -100, user: users[2] },
      ];

      const settlements = calculateSettlements(balances);

      // Должно быть 2 транзакции: user2 -> user1 и user3 -> user1
      expect(settlements).toHaveLength(2);
      expect(settlements[0].from).toBe('user2');
      expect(settlements[0].to).toBe('user1');
      expect(settlements[0].amount).toBe(100);
      expect(settlements[1].from).toBe('user3');
      expect(settlements[1].to).toBe('user1');
      expect(settlements[1].amount).toBe(100);
    });

    it('должен обрабатывать случай, когда все квиты', () => {
      const balances = [
        { userId: 'user1', balance: 0, user: users[0] },
        { userId: 'user2', balance: 0, user: users[1] },
        { userId: 'user3', balance: 0, user: users[2] },
      ];

      const settlements = calculateSettlements(balances);

      // Транзакций быть не должно
      expect(settlements).toHaveLength(0);
    });

    it('должен оптимизировать сложные случаи', () => {
      const balances = [
        { userId: 'user1', balance: 150, user: users[0] },
        { userId: 'user2', balance: -50, user: users[1] },
        { userId: 'user3', balance: -100, user: users[2] },
      ];

      const settlements = calculateSettlements(balances);

      // Должно быть 2 транзакции
      expect(settlements).toHaveLength(2);
      
      // Проверяем, что сумма всех транзакций равна балансу
      const totalTransferred = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalTransferred).toBe(150);
    });

    it('должен игнорировать очень маленькие балансы (< 0.01)', () => {
      const balances = [
        { userId: 'user1', balance: 0.005, user: users[0] },
        { userId: 'user2', balance: -0.005, user: users[1] },
        { userId: 'user3', balance: 0, user: users[2] },
      ];

      const settlements = calculateSettlements(balances);

      // Такие маленькие балансы должны игнорироваться
      expect(settlements).toHaveLength(0);
    });
  });

  describe('getGroupSummary', () => {
    it('должен возвращать полную сводку по группе', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Ужин',
          amount: 300,
          paidBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'food',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'exp2',
          groupId: 'group1',
          description: 'Такси',
          amount: 150,
          paidBy: 'user2',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'transport',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const summary = getGroupSummary(expenses, users);

      expect(summary.totalAmount).toBe(450);
      expect(summary.expensesCount).toBe(2);
      expect(summary.balances).toHaveLength(3);
      expect(summary.settlements).toBeDefined();
    });

    it('должен обрабатывать пустой список расходов', () => {
      const summary = getGroupSummary([], users);

      expect(summary.totalAmount).toBe(0);
      expect(summary.expensesCount).toBe(0);
      expect(summary.balances).toHaveLength(3);
      expect(summary.settlements).toHaveLength(0);
    });
  });
});










