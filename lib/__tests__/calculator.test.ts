import { calculateBalances, calculateSettlements, getGroupSummary, calculateExpenseShares } from '../calculator';
import { Expense, User } from '@/types';

describe('calculator', () => {
  // Тестовые данные
  const users: User[] = [
    { id: 'user1', telegramId: 1, firstName: 'Алиса', username: 'alice', isPremium: false, createdAt: new Date() },
    { id: 'user2', telegramId: 2, firstName: 'Боб', username: 'bob', isPremium: false, createdAt: new Date() },
    { id: 'user3', telegramId: 3, firstName: 'Виктор', username: 'victor', isPremium: false, createdAt: new Date() },
  ];

  describe('calculateBalances', () => {
    it('должен правильно рассчитывать балансы для простого случая', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Ужин',
          amount: 300,
          currency: 'RUB',
          paidBy: 'user1',
          createdBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'food',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
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
          currency: 'RUB',
          paidBy: 'user1', // Алиса платит 300
          createdBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'], // делят на троих
          category: 'food',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
        },
        {
          id: 'exp2',
          groupId: 'group1',
          description: 'Такси',
          amount: 150,
          currency: 'RUB',
          paidBy: 'user2', // Боб платит 150
          createdBy: 'user2',
          splitBetween: ['user1', 'user2', 'user3'], // делят на троих
          category: 'transport',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
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
          currency: 'RUB',
          paidBy: 'user1',
          createdBy: 'user1',
          splitBetween: ['user1', 'user2'], // только двое
          category: 'food',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
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
          currency: 'RUB',
          paidBy: 'user1',
          createdBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'other',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
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
          currency: 'RUB',
          paidBy: 'user1',
          createdBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'food',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
        },
        {
          id: 'exp2',
          groupId: 'group1',
          description: 'Такси',
          amount: 150,
          currency: 'RUB',
          paidBy: 'user2',
          createdBy: 'user2',
          splitBetween: ['user1', 'user2', 'user3'],
          category: 'transport',
          date: new Date(),
          createdAt: new Date(),
          splitType: 'equal',
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

  describe('calculateExpenseShares (Custom Split)', () => {
    it('должен правильно рассчитывать равное разделение (equal split)', () => {
      const expense: Expense = {
        id: 'exp1',
        groupId: 'group1',
        description: 'Пицца',
        amount: 1500,
        currency: 'RUB',
        paidBy: 'user1',
        createdBy: 'user1',
        splitBetween: ['user1', 'user2', 'user3'],
        splitType: 'equal',
        category: 'food',
        date: new Date(),
        createdAt: new Date(),
      };

      const shares = calculateExpenseShares(expense);

      expect(shares['user1']).toBe(500);
      expect(shares['user2']).toBe(500);
      expect(shares['user3']).toBe(500);
    });

    it('должен правильно рассчитывать неравномерное разделение (custom split)', () => {
      const expense: Expense = {
        id: 'exp1',
        groupId: 'group1',
        description: 'Пицца',
        amount: 1500,
        currency: 'RUB',
        paidBy: 'user1',
        createdBy: 'user1',
        splitBetween: ['user1', 'user2', 'user3'],
        splitType: 'custom',
        customSplits: {
          'user1': 2,  // 2 доли
          'user2': 1,  // 1 доля
          'user3': 1,  // 1 доля
        },
        category: 'food',
        date: new Date(),
        createdAt: new Date(),
      };

      const shares = calculateExpenseShares(expense);

      // Всего 4 доли, цена доли = 1500/4 = 375
      expect(shares['user1']).toBe(750);  // 2 × 375
      expect(shares['user2']).toBe(375);  // 1 × 375
      expect(shares['user3']).toBe(375);  // 1 × 375
    });

    it('должен правильно работать с разными соотношениями долей', () => {
      const expense: Expense = {
        id: 'exp1',
        groupId: 'group1',
        description: 'Ужин',
        amount: 3000,
        currency: 'RUB',
        paidBy: 'user1',
        createdBy: 'user1',
        splitBetween: ['user1', 'user2'],
        splitType: 'custom',
        customSplits: {
          'user1': 3,  // 3 доли (60%)
          'user2': 2,  // 2 доли (40%)
        },
        category: 'food',
        date: new Date(),
        createdAt: new Date(),
      };

      const shares = calculateExpenseShares(expense);

      // Всего 5 долей, цена доли = 3000/5 = 600
      expect(shares['user1']).toBe(1800);  // 3 × 600
      expect(shares['user2']).toBe(1200);  // 2 × 600
    });

    it('должен интегрироваться с calculateBalances для custom split', () => {
      const expenses: Expense[] = [
        {
          id: 'exp1',
          groupId: 'group1',
          description: 'Пицца',
          amount: 1500,
          currency: 'RUB',
          paidBy: 'user1',
          createdBy: 'user1',
          splitBetween: ['user1', 'user2', 'user3'],
          splitType: 'custom',
          customSplits: {
            'user1': 2,  // Алиса съела 2 кусочка
            'user2': 1,  // Боб съел 1
            'user3': 1,  // Виктор съел 1
          },
          category: 'food',
          date: new Date(),
          createdAt: new Date(),
        },
      ];

      const balances = calculateBalances(expenses, users);

      // Алиса заплатила 1500, но должна только 750 (2/4)
      // Итого: +750
      expect(balances.find(b => b.userId === 'user1')?.balance).toBe(750);
      
      // Боб не платил, но должен 375 (1/4)
      expect(balances.find(b => b.userId === 'user2')?.balance).toBe(-375);
      
      // Виктор не платил, но должен 375 (1/4)
      expect(balances.find(b => b.userId === 'user3')?.balance).toBe(-375);
    });
  });
});
