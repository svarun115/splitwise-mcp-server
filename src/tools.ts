import { SplitwiseClient } from './splitwise-client.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export function getUserTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_current_user',
      description: 'Get information about the currently authenticated Splitwise user, including their ID, name, email, notification settings, and default currency.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'splitwise_get_user',
      description: 'Get information about another Splitwise user by their user ID.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The user ID to fetch information for',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_update_user',
      description: 'Update information for a Splitwise user. Can update first name, last name, email, password, locale, and default currency.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The user ID to update',
          },
          first_name: {
            type: 'string',
            description: 'New first name',
          },
          last_name: {
            type: 'string',
            description: 'New last name',
          },
          email: {
            type: 'string',
            description: 'New email address',
          },
          password: {
            type: 'string',
            description: 'New password',
          },
          locale: {
            type: 'string',
            description: 'Locale setting (e.g., "en")',
          },
          default_currency: {
            type: 'string',
            description: 'Default currency code (e.g., "USD")',
          },
        },
        required: ['id'],
      },
    },
  ];
}

export function getGroupTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_groups',
      description: 'List all groups for the current user. Groups represent collections of users who share expenses together (e.g., household, trip, etc.).',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'splitwise_get_group',
      description: 'Get detailed information about a specific group, including members, balances, and settings.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The group ID',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_create_group',
      description: 'Create a new group. Can add users by providing their email/name or user_id. User fields should be in the format users__0__email, users__0__first_name, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the group',
          },
          group_type: {
            type: 'string',
            description: 'Type of group: home, trip, couple, other, apartment, or house',
            enum: ['home', 'trip', 'couple', 'other', 'apartment', 'house'],
          },
          simplify_by_default: {
            type: 'boolean',
            description: 'Whether to simplify debts by default',
          },
          users: {
            type: 'array',
            description: 'Array of user objects to add to the group. Each user should have either user_id OR (email and optionally first_name/last_name)',
            items: {
              type: 'object',
              properties: {
                user_id: { type: 'number' },
                email: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
              },
            },
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'splitwise_delete_group',
      description: 'Delete a group. This destroys all associated records including expenses.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The group ID to delete',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_restore_group',
      description: 'Restore a deleted group.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The group ID to restore',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_add_user_to_group',
      description: 'Add a user to an existing group. Provide either user_id or email/first_name/last_name.',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: {
            type: 'number',
            description: 'The group ID',
          },
          user_id: {
            type: 'number',
            description: 'ID of existing user to add',
          },
          email: {
            type: 'string',
            description: 'Email of user to add',
          },
          first_name: {
            type: 'string',
            description: 'First name of user to add',
          },
          last_name: {
            type: 'string',
            description: 'Last name of user to add',
          },
        },
        required: ['group_id'],
      },
    },
    {
      name: 'splitwise_remove_user_from_group',
      description: 'Remove a user from a group. Note: This only succeeds if the user has a zero balance in the group.',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: {
            type: 'number',
            description: 'The group ID',
          },
          user_id: {
            type: 'number',
            description: 'The user ID to remove',
          },
        },
        required: ['group_id', 'user_id'],
      },
    },
  ];
}

export function getFriendTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_friends',
      description: 'List all friends of the current user, including balance information.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'splitwise_get_friend',
      description: 'Get detailed information about a specific friend, including shared groups and balances.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The friend user ID',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_add_friend',
      description: 'Add a new friend. If the user exists, first_name and last_name are ignored. If creating a new user, first_name is required.',
      inputSchema: {
        type: 'object',
        properties: {
          user_email: {
            type: 'string',
            description: 'Email address of the friend',
          },
          user_first_name: {
            type: 'string',
            description: 'First name (required if user does not exist)',
          },
          user_last_name: {
            type: 'string',
            description: 'Last name',
          },
        },
        required: ['user_email'],
      },
    },
    {
      name: 'splitwise_add_friends',
      description: 'Add multiple friends at once. Provide users array with email/first_name/last_name for each.',
      inputSchema: {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            description: 'Array of user objects with email, first_name, and last_name',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
              },
              required: ['email'],
            },
          },
        },
        required: ['users'],
      },
    },
    {
      name: 'splitwise_remove_friend',
      description: 'Remove a friend connection. This breaks off the friendship between the current user and the specified user.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The friend user ID to remove',
          },
        },
        required: ['id'],
      },
    },
  ];
}

export function getExpenseTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_expenses',
      description: 'List expenses with optional filters. Can filter by group, friend, date range, or update time.',
      inputSchema: {
        type: 'object',
        properties: {
          group_id: {
            type: 'number',
            description: 'Filter by group ID',
          },
          friend_id: {
            type: 'number',
            description: 'Filter by friend user ID',
          },
          dated_after: {
            type: 'string',
            description: 'Filter expenses dated after this date (ISO 8601 format)',
          },
          dated_before: {
            type: 'string',
            description: 'Filter expenses dated before this date (ISO 8601 format)',
          },
          updated_after: {
            type: 'string',
            description: 'Filter expenses updated after this time (ISO 8601 format)',
          },
          updated_before: {
            type: 'string',
            description: 'Filter expenses updated before this time (ISO 8601 format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of expenses to return (default: 20)',
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination (default: 0)',
          },
        },
      },
    },
    {
      name: 'splitwise_get_expense',
      description: 'Get detailed information about a specific expense, including all users involved and their shares.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The expense ID',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_create_expense',
      description: 'Create a new expense. Can split equally among group members or specify custom shares for each user. For custom shares, provide users array with paid_share and owed_share for each user.',
      inputSchema: {
        type: 'object',
        properties: {
          cost: {
            type: 'string',
            description: 'Total cost as a decimal string (e.g., "25.00")',
          },
          description: {
            type: 'string',
            description: 'Short description of the expense',
          },
          details: {
            type: 'string',
            description: 'Additional notes about the expense',
          },
          date: {
            type: 'string',
            description: 'Date of expense (ISO 8601 format). Defaults to now.',
          },
          repeat_interval: {
            type: 'string',
            description: 'Repeat frequency',
            enum: ['never', 'weekly', 'fortnightly', 'monthly', 'yearly'],
          },
          currency_code: {
            type: 'string',
            description: 'Currency code (e.g., "USD")',
          },
          category_id: {
            type: 'number',
            description: 'Category ID from get_categories',
          },
          group_id: {
            type: 'number',
            description: 'Group ID (0 for expenses outside a group)',
          },
          split_equally: {
            type: 'boolean',
            description: 'Whether to split equally among group members',
          },
          users: {
            type: 'array',
            description: 'Array of user share objects (required if not splitting equally). Each must have paid_share, owed_share, and either user_id or email/first_name/last_name',
            items: {
              type: 'object',
              properties: {
                user_id: { type: 'number' },
                email: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                paid_share: { type: 'string', description: 'Amount this user paid' },
                owed_share: { type: 'string', description: 'Amount this user owes' },
              },
            },
          },
        },
        required: ['cost', 'description'],
      },
    },
    {
      name: 'splitwise_update_expense',
      description: 'Update an existing expense. Only include fields that are changing. If users array is provided, all shares will be overwritten.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The expense ID to update',
          },
          cost: {
            type: 'string',
            description: 'Total cost as a decimal string',
          },
          description: {
            type: 'string',
            description: 'Short description of the expense',
          },
          details: {
            type: 'string',
            description: 'Additional notes about the expense',
          },
          date: {
            type: 'string',
            description: 'Date of expense (ISO 8601 format)',
          },
          repeat_interval: {
            type: 'string',
            description: 'Repeat frequency',
            enum: ['never', 'weekly', 'fortnightly', 'monthly', 'yearly'],
          },
          currency_code: {
            type: 'string',
            description: 'Currency code',
          },
          category_id: {
            type: 'number',
            description: 'Category ID',
          },
          group_id: {
            type: 'number',
            description: 'Group ID',
          },
          users: {
            type: 'array',
            description: 'Array of user share objects to update. If provided, replaces all existing shares.',
            items: {
              type: 'object',
              properties: {
                user_id: { type: 'number' },
                email: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                paid_share: { type: 'string' },
                owed_share: { type: 'string' },
              },
            },
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_delete_expense',
      description: 'Delete an expense permanently.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The expense ID to delete',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'splitwise_restore_expense',
      description: 'Restore a deleted expense.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The expense ID to restore',
          },
        },
        required: ['id'],
      },
    },
  ];
}

export function getCommentTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_comments',
      description: 'Get all comments for a specific expense.',
      inputSchema: {
        type: 'object',
        properties: {
          expense_id: {
            type: 'number',
            description: 'The expense ID to get comments for',
          },
        },
        required: ['expense_id'],
      },
    },
    {
      name: 'splitwise_add_comment',
      description: 'Add a comment to an expense.',
      inputSchema: {
        type: 'object',
        properties: {
          expense_id: {
            type: 'number',
            description: 'The expense ID to comment on',
          },
          content: {
            type: 'string',
            description: 'The comment text',
          },
        },
        required: ['expense_id', 'content'],
      },
    },
    {
      name: 'splitwise_delete_comment',
      description: 'Delete a comment from an expense.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'The comment ID to delete',
          },
        },
        required: ['id'],
      },
    },
  ];
}

export function getNotificationTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_notifications',
      description: 'Get recent notifications/activity for the user account. Returns expenses added/updated/deleted, comments, group changes, friend changes, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          updated_after: {
            type: 'string',
            description: 'Only return notifications after this time (ISO 8601 format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of notifications to return (0 for maximum)',
          },
        },
      },
    },
  ];
}

export function getUtilityTools(): Tool[] {
  return [
    {
      name: 'splitwise_get_currencies',
      description: 'Get a list of all currencies supported by Splitwise. Returns ISO 4217 currency codes.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'splitwise_get_categories',
      description: 'Get a list of all expense categories supported by Splitwise. Use subcategory IDs when creating expenses.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

export function getAllTools(): Tool[] {
  return [
    ...getUserTools(),
    ...getGroupTools(),
    ...getFriendTools(),
    ...getExpenseTools(),
    ...getCommentTools(),
    ...getNotificationTools(),
    ...getUtilityTools(),
  ];
}

// Helper function to flatten user array into Splitwise's format
export function flattenUsers(users: any[], prefix: string = 'users'): Record<string, any> {
  const flattened: Record<string, any> = {};
  users.forEach((user, index) => {
    Object.keys(user).forEach((key) => {
      flattened[`${prefix}__${index}__${key}`] = user[key];
    });
  });
  return flattened;
}

export async function handleToolCall(
  name: string,
  args: any,
  client: SplitwiseClient
): Promise<any> {
  try {
    switch (name) {
      // User tools
      case 'splitwise_get_current_user':
        return await client.getCurrentUser();
      
      case 'splitwise_get_user':
        return await client.getUser(args.id);
      
      case 'splitwise_update_user':
        const { id, ...updateData } = args;
        return await client.updateUser(id, updateData);

      // Group tools
      case 'splitwise_get_groups':
        return await client.getGroups();
      
      case 'splitwise_get_group':
        return await client.getGroup(args.id);
      
      case 'splitwise_create_group': {
        const { users, ...groupData } = args;
        const data = users ? { ...groupData, ...flattenUsers(users) } : groupData;
        return await client.createGroup(data);
      }
      
      case 'splitwise_delete_group':
        return await client.deleteGroup(args.id);
      
      case 'splitwise_restore_group':
        return await client.undeleteGroup(args.id);
      
      case 'splitwise_add_user_to_group':
        return await client.addUserToGroup(args);
      
      case 'splitwise_remove_user_from_group':
        return await client.removeUserFromGroup(args);

      // Friend tools
      case 'splitwise_get_friends':
        return await client.getFriends();
      
      case 'splitwise_get_friend':
        return await client.getFriend(args.id);
      
      case 'splitwise_add_friend':
        return await client.createFriend(args);
      
      case 'splitwise_add_friends': {
        const flattened = flattenUsers(args.users);
        return await client.createFriends(flattened);
      }
      
      case 'splitwise_remove_friend':
        return await client.deleteFriend(args.id);

      // Expense tools
      case 'splitwise_get_expenses':
        return await client.getExpenses(args);
      
      case 'splitwise_get_expense':
        return await client.getExpense(args.id);
      
      case 'splitwise_create_expense': {
        const { users, ...expenseData } = args;
        const data = users ? { ...expenseData, ...flattenUsers(users) } : expenseData;
        return await client.createExpense(data);
      }
      
      case 'splitwise_update_expense': {
        const { id: expenseId, users, ...updateData } = args;
        const data = users ? { ...updateData, ...flattenUsers(users) } : updateData;
        return await client.updateExpense(expenseId, data);
      }
      
      case 'splitwise_delete_expense':
        return await client.deleteExpense(args.id);
      
      case 'splitwise_restore_expense':
        return await client.undeleteExpense(args.id);

      // Comment tools
      case 'splitwise_get_comments':
        return await client.getComments(args.expense_id);
      
      case 'splitwise_add_comment':
        return await client.createComment(args);
      
      case 'splitwise_delete_comment':
        return await client.deleteComment(args.id);

      // Notification tools
      case 'splitwise_get_notifications':
        return await client.getNotifications(args);

      // Utility tools
      case 'splitwise_get_currencies':
        return await client.getCurrencies();
      
      case 'splitwise_get_categories':
        return await client.getCategories();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw error;
  }
}
