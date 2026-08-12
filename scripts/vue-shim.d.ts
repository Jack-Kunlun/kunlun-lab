declare module "*.vue" {
  type ToolComponent = Awaited<
    ReturnType<import("@kunlun/tool-kit").ToolManifest["component"]>
  >["default"];

  const component: ToolComponent;

  export default component;
}
