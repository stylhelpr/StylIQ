import { CreateWardrobeItemDto } from './create-wardrobe-item.dto';

// Hotfix: make Update = Partial<Create>
export type UpdateWardrobeItemDto = Partial<CreateWardrobeItemDto>;
