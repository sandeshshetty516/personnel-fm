import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import BusinessCenterOutlined from '@mui/icons-material/BusinessCenterOutlined';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { AccountType } from '../../types/account';

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; Icon: SvgIconComponent }> = {
  SAVINGS: { label: 'Savings', Icon: AccountBalanceOutlined },
  CURRENT: { label: 'Current', Icon: BusinessCenterOutlined },
  CASH: { label: 'Cash', Icon: PaymentsOutlined },
  CREDIT_CARD: { label: 'Credit card', Icon: CreditCardOutlined },
  WALLET: { label: 'Wallet', Icon: AccountBalanceWalletOutlined },
};

/**
 * Credit cards hold debt: the API stores what is owed as a negative balance, but people
 * think of it as a positive "amount owed", so the UI flips the sign for that type only.
 */
export const isLiability = (type: AccountType) => type === 'CREDIT_CARD';
