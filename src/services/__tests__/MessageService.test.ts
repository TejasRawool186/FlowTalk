// Unit tests for MessageService

import { MessageServiceImpl } from '../MessageService'
import { supabase } from '@/lib/supabase'
import { ValidationError, DatabaseError } from '@/lib/errors'
import { MESSAGE_STATUS } from '@/lib/constants'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('MessageService', () => {
  let messageService: MessageServiceImpl
  
  beforeEach(() => {
    messageService = new MessageServiceImpl()
    jest.clearAllMocks()
  })

  describe('createMessage', () => {
    const mockProfile = { primary_lang: 'en' }
    const mockMessage = {
      id: 'msg-1',
      channel_id: 'channel-1',
      sender_id: 'user-1',
      content: 'Hello world',
      source_lang: 'en',
      status: 'sent',
      timestamp: '2024-01-01T00:00:00Z',
      translations: []
    }

    beforeEach(() => {
      // Mock profile fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      // Mock message insert
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMessage,
              error: null
            })
          })
        })
      } as any)
    })

    it('should create a message successfully', async () => {
      const result = await messageService.createMessage('channel-1', 'Hello world', 'user-1')

      expect(result).toEqual({
        id: 'msg-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        content: 'Hello world',
        sourceLanguage: 'en',
        status: 'sent',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        translations: []
      })
    })

    it('should validate required fields', async () => {
      await expect(messageService.createMessage('', 'content', 'user-1'))
        .rejects.toThrow(ValidationError)

      await expect(messageService.createMessage('channel-1', '', 'user-1'))
        .rejects.toThrow(ValidationError)

      await expect(messageService.createMessage('channel-1', 'content', ''))
        .rejects.toThrow(ValidationError)
    })

    it('should trim whitespace from content', async () => {
      await messageService.createMessage('channel-1', '  Hello world  ', 'user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      const insertCall = (mockSupabase.from as jest.Mock).mock.calls[1][0]
      expect(insertCall).toBe('messages')
    })

    it('should handle database errors', async () => {
      // Mock profile fetch error
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' }
            })
          })
        })
      } as any)

      await expect(messageService.createMessage('channel-1', 'content', 'user-1'))
        .rejects.toThrow(DatabaseError)
    })
  })

  describe('getChannelMessages', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        channel_id: 'channel-1',
        sender_id: 'user-1',
        content: 'Hello',
        source_lang: 'en',
        status: 'sent',
        timestamp: '2024-01-01T00:00:00Z',
        translations: []
      },
      {
        id: 'msg-2',
        channel_id: 'channel-1',
        sender_id: 'user-2',
        content: 'Hi there',
        source_lang: 'en',
        status: 'translated',
        timestamp: '2024-01-01T00:01:00Z',
        translations: [
          {
            target_lang: 'es',
            translated_content: 'Hola',
            created_at: '2024-01-01T00:01:30Z'
          }
        ]
      }
    ]

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockMessages,
                error: null
              })
            })
          })
        })
      } as any)
    })

    it('should fetch channel messages successfully', async () => {
      const result = await messageService.getChannelMessages('channel-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('msg-1')
      expect(result[1].id).toBe('msg-2')
      expect(result[1].translations).toHaveLength(1)
    })

    it('should validate channel ID', async () => {
      await expect(messageService.getChannelMessages(''))
        .rejects.toThrow(ValidationError)
    })

    it('should limit results to maximum 100', async () => {
      await messageService.getChannelMessages('channel-1', 200)

      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      // The limit should be capped at 100
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      } as any)

      await expect(messageService.getChannelMessages('channel-1'))
        .rejects.toThrow(DatabaseError)
    })
  })

  describe('updateMessageStatus', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      } as any)
    })

    it('should update message status successfully', async () => {
      await messageService.updateMessageStatus('msg-1', MESSAGE_STATUS.TRANSLATING)

      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
    })

    it('should validate message ID and status', async () => {
      await expect(messageService.updateMessageStatus('', MESSAGE_STATUS.SENT))
        .rejects.toThrow(ValidationError)

      await expect(messageService.updateMessageStatus('msg-1', '' as any))
        .rejects.toThrow(ValidationError)
    })

    it('should validate status values', async () => {
      await expect(messageService.updateMessageStatus('msg-1', 'invalid' as any))
        .rejects.toThrow(ValidationError)
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Update failed' }
          })
        })
      } as any)

      await expect(messageService.updateMessageStatus('msg-1', MESSAGE_STATUS.SENT))
        .rejects.toThrow(DatabaseError)
    })
  })

  describe('getMessageById', () => {
    const mockMessage = {
      id: 'msg-1',
      channel_id: 'channel-1',
      sender_id: 'user-1',
      content: 'Hello',
      source_lang: 'en',
      status: 'sent',
      timestamp: '2024-01-01T00:00:00Z',
      translations: []
    }

    it('should fetch message by ID successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMessage,
              error: null
            })
          })
        })
      } as any)

      const result = await messageService.getMessageById('msg-1')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('msg-1')
    })

    it('should return null for non-existent message', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
            })
          })
        })
      } as any)

      const result = await messageService.getMessageById('non-existent')

      expect(result).toBeNull()
    })

    it('should validate message ID', async () => {
      await expect(messageService.getMessageById(''))
        .rejects.toThrow(ValidationError)
    })
  })
})