export interface BuildStrategy {
  /**
   * Detect if this build system is present in the project
   */
  detect(projectDir: string): Promise<boolean>;

  /**
   * Build the project
   */
  build(
    projectDir: string,
    installDir: string,
    url: string,
    version: string,
  ): Promise<void>;

  /**
   * Get the name of this build system
   */
  getName(): string;

  /**
   * Get the detection file/pattern for this build system
   */
  getDetectionFile(): string;
}

export abstract class BaseBuildStrategy implements BuildStrategy {
  abstract detect(projectDir: string): Promise<boolean>;
  abstract build(
    projectDir: string,
    installDir: string,
    url: string,
    version: string,
  ): Promise<void>;
  abstract getName(): string;
  abstract getDetectionFile(): string;
}
