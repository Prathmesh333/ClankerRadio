// Keep at most one submitted frame in flight. UHD must not starve controls on a slow GPU.
export function gpuFrameGate(context: WebGLRenderingContext | WebGL2RenderingContext) {
  const gl = context as WebGL2RenderingContext;
  let fence: WebGLSync | null = null;
  return {
    ready() {
      if (!fence || !gl.clientWaitSync) return true;
      if (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) return false;
      gl.deleteSync(fence); fence = null; return true;
    },
    submitted() { if (gl.fenceSync) { fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); } },
    dispose() { if (fence) gl.deleteSync(fence); fence = null; },
  };
}
