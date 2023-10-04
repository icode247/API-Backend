export interface ILocation {
  type: string;
  coordinates: number[];
}

export interface IOrganizationLocationOptions {
  page: number;
  pageSize: number;
  loc?: ILocation;
}
