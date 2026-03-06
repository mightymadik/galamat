declare module "docxtemplater-image-module-free" {
  interface ImageModuleOptions {
    fileType?: string;
    centered?: boolean;
    getImage(
      tagValue: string,
      tagName: string
    ): Buffer | Promise<Buffer> | null;
    getSize(
      imgBuffer: Buffer,
      tagValue: string,
      tagName: string
    ): [number, number];
  }
  class ImageModule {
    constructor(options: ImageModuleOptions);
  }
  export = ImageModule;
}
