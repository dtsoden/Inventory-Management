import { BaseRepository } from '../base/BaseRepository';

export class VendorRepository extends BaseRepository<any> {
  protected get modelName() {
    return 'vendor';
  }
}
