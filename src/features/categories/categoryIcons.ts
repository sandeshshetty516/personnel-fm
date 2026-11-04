import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import CardGiftcardOutlined from '@mui/icons-material/CardGiftcardOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import ChildCareOutlined from '@mui/icons-material/ChildCareOutlined';
import DirectionsBusOutlined from '@mui/icons-material/DirectionsBusOutlined';
import FlightOutlined from '@mui/icons-material/FlightOutlined';
import HealthAndSafetyOutlined from '@mui/icons-material/HealthAndSafetyOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import LaptopMacOutlined from '@mui/icons-material/LaptopMacOutlined';
import LocalGasStationOutlined from '@mui/icons-material/LocalGasStationOutlined';
import LocalGroceryStoreOutlined from '@mui/icons-material/LocalGroceryStoreOutlined';
import LocalHospitalOutlined from '@mui/icons-material/LocalHospitalOutlined';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import PercentOutlined from '@mui/icons-material/PercentOutlined';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import RestaurantOutlined from '@mui/icons-material/RestaurantOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import SmartphoneOutlined from '@mui/icons-material/SmartphoneOutlined';
import SpaOutlined from '@mui/icons-material/SpaOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import SubscriptionsOutlined from '@mui/icons-material/SubscriptionsOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import UndoOutlined from '@mui/icons-material/UndoOutlined';
import VolunteerActivismOutlined from '@mui/icons-material/VolunteerActivismOutlined';
import WorkOutlined from '@mui/icons-material/WorkOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { CategoryIcon } from '../../types/category';

export const CATEGORY_ICON_COMPONENTS: Record<CategoryIcon, SvgIconComponent> = {
  salary: WorkOutlined,
  freelance: LaptopMacOutlined,
  business: StorefrontOutlined,
  interest: PercentOutlined,
  investment: TrendingUpOutlined,
  gift: CardGiftcardOutlined,
  refund: UndoOutlined,
  home: HomeOutlined,
  groceries: LocalGroceryStoreOutlined,
  dining: RestaurantOutlined,
  fuel: LocalGasStationOutlined,
  transport: DirectionsBusOutlined,
  utilities: BoltOutlined,
  phone: SmartphoneOutlined,
  shopping: ShoppingBagOutlined,
  health: LocalHospitalOutlined,
  education: SchoolOutlined,
  entertainment: MovieOutlined,
  travel: FlightOutlined,
  insurance: HealthAndSafetyOutlined,
  loan: AccountBalanceOutlined,
  'personal-care': SpaOutlined,
  pets: PetsOutlined,
  kids: ChildCareOutlined,
  subscriptions: SubscriptionsOutlined,
  tax: RequestQuoteOutlined,
  charity: VolunteerActivismOutlined,
  other: CategoryOutlined,
};

export const CATEGORY_COLORS = [
  '#2e7d32',
  '#00897b',
  '#0277bd',
  '#3949ab',
  '#6a1b9a',
  '#ad1457',
  '#c62828',
  '#ef6c00',
  '#f9a825',
  '#5d4037',
  '#455a64',
  '#78909c',
] as const;
