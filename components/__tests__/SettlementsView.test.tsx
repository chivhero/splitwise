import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SettlementsView from '../SettlementsView';
import { Group } from '@/types';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock fetch API
global.fetch = jest.fn();

describe('SettlementsView', () => {
  const mockGroup: Group = {
    id: 'group1',
    name: 'Тестовая группа',
    currency: '₽',
    createdBy: 'user1',
    createdAt: new Date().toISOString(),
    members: [
      {
        groupId: 'group1',
        userId: 'user1',
        role: 'admin',
        joinedAt: new Date().toISOString(),
        user: { id: 'user1', firstName: 'Алиса', username: 'alice' },
      },
      {
        groupId: 'group1',
        userId: 'user2',
        role: 'member',
        joinedAt: new Date().toISOString(),
        user: { id: 'user2', firstName: 'Боб', username: 'bob' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('должен показывать загрузку', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    // Проверяем наличие спиннера загрузки
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('должен показывать сообщение об ошибке при неудачной загрузке', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить данные')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('должен показывать сообщение "Нет расходов"', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        summary: {
          totalAmount: 0,
          expensesCount: 0,
          balances: [],
          settlements: [],
        },
      }),
    });
    
    render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Нет расходов')).toBeInTheDocument();
      expect(screen.getByText('Добавьте расходы, чтобы увидеть расчеты')).toBeInTheDocument();
    });
  });

  it('должен отображать сводку с расходами', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        summary: {
          totalAmount: 450,
          expensesCount: 2,
          balances: [
            { userId: 'user1', balance: 150 },
            { userId: 'user2', balance: -150 },
          ],
          settlements: [
            { from: 'user2', to: 'user1', amount: 150 },
          ],
        },
      }),
    });
    
    render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      // Проверяем общую сумму
      expect(screen.getByText(/450\.00/)).toBeInTheDocument();
      expect(screen.getByText('2 расхода')).toBeInTheDocument();
      
      // Проверяем переводы
      expect(screen.getByText('Необходимые переводы (1)')).toBeInTheDocument();
      expect(screen.getAllByText('Алиса').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Боб').length).toBeGreaterThan(0);
    });
  });

  it('должен показывать "Все расчёты завершены", если нет долгов', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        summary: {
          totalAmount: 300,
          expensesCount: 2,
          balances: [
            { userId: 'user1', balance: 0 },
            { userId: 'user2', balance: 0 },
          ],
          settlements: [],
        },
      }),
    });
    
    render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Все расчёты завершены! 🎉')).toBeInTheDocument();
      expect(screen.getByText('Никто никому не должен')).toBeInTheDocument();
    });
  });

  it('должен правильно отображать балансы', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        summary: {
          totalAmount: 300,
          expensesCount: 1,
          balances: [
            { userId: 'user1', balance: 100.50 },
            { userId: 'user2', balance: -100.50 },
          ],
          settlements: [
            { from: 'user2', to: 'user1', amount: 100.50 },
          ],
        },
      }),
    });
    
    render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Баланс участников')).toBeInTheDocument();
      expect(screen.getByText('+100.50 ₽')).toBeInTheDocument();
      expect(screen.getByText('-100.50 ₽')).toBeInTheDocument();
      expect(screen.getByText('Вам должны')).toBeInTheDocument();
      expect(screen.getByText('Вы должны')).toBeInTheDocument();
    });
  });

  it('должен перезагружать данные при изменении groupId', async () => {
    const { rerender } = render(
      <LanguageProvider>
        <SettlementsView groupId="group1" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/groups/group1/summary');
    });

    rerender(
      <LanguageProvider>
        <SettlementsView groupId="group2" group={mockGroup} />
      </LanguageProvider>
    );
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/groups/group2/summary');
    });
  });
});

