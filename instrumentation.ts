import { LangfuseExporter } from "langfuse-vercel";
import { registerOTel } from '@vercel/otel';

export function register() {
  const exporter = new LangfuseExporter({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL,
  });

  registerOTel({
    serviceName: 'openmtp-ai-bot',
    traceExporter: exporter,
  });
}

//
// import { registerOTel } from "@vercel/otel";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import {
//   isOpenInferenceSpan,
//   OpenInferenceSimpleSpanProcessor,
// } from "@arizeai/openinference-vercel";
// import { Metadata } from "@grpc/grpc-js";
// import { OTLPTraceExporter as GrpcOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
//
// // For troubleshooting, set the log level to DiagLogLevel.DEBUG
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
//
// export function register() {
//   // Arize specific - Create metadata and add your headers
//   const metadata = new Metadata();
//
//   // Your Arize Space and API Keys, which can be found in the UI
//   metadata.set("space_id", "my_space_id");
//   metadata.set("api_key", process.env.PHOENIX_API_KEY!);
//   registerOTel({
//     serviceName: "next-app",
//     traceExporter: new GrpcOTLPTraceExporter({
//       url: "https://otlp.arize.com",
//       metadata,
//     })
//   });
// }

// import { registerOTel } from "@vercel/otel";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import {
//   isOpenInferenceSpan,
//   OpenInferenceSimpleSpanProcessor,
// } from "@arizeai/openinference-vercel";
// import { Metadata } from "@grpc/grpc-js";
// import { OTLPTraceExporter as GrpcOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
//
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
//
// export function register() {
//   const metadata = new Metadata();
//   metadata.set("api_key", process.env.PHOENIX_API_KEY!);
//
//   registerOTel({
//     serviceName: "openmtp-ai-bot",
//     attributes: {
//       model_id: "gpt-4o-mini",
//       model_version: "1.0.0",
//     },
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor({
//         exporter: new GrpcOTLPTraceExporter({
//           url: "https://otlp.arize.com",
//           metadata,
//         }),
//         spanFilter: (span) => {
//           return isOpenInferenceSpan(span);
//         },
//       }),
//     ],
//   });
// }
//
//


// import { registerOTel } from "@vercel/otel";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import {
//   isOpenInferenceSpan,
//   OpenInferenceSimpleSpanProcessor,
// } from "@arizeai/openinference-vercel";
// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
// import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
//
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
//
// export function register() {
//   registerOTel({
//     serviceName: "openmtp-ai-bot",
//     attributes: {
//       [SEMRESATTRS_PROJECT_NAME]: "openmtp-ai-bot",
//     },
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor({
//         exporter: new OTLPTraceExporter({
//           headers: {
//             api_key: process.env.PHOENIX_API_KEY!,
//           },
//           url: process.env.PHOENIX_COLLECTOR_ENDPOINT!,
//         }),
//         spanFilter: isOpenInferenceSpan,
//       }),
//     ],
//   });
// }

// import { registerOTel } from "@vercel/otel";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import {
//   isOpenInferenceSpan,
//   OpenInferenceSimpleSpanProcessor,
// } from "@arizeai/openinference-vercel";
// import { OTLPTraceExporter } from
//     "@opentelemetry/exporter-trace-otlp-proto";
// import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
//
// // For troubleshooting, set the log level to DiagLogLevel.DEBUG
// // This is not required and should not be added in a production setting
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
//
// export function register() {
//   registerOTel({
//     serviceName: "openmtp-ai-bot",
//     attributes: {
//       // This is not required but it will allow you to send traces to a specific project in phoenix
//       [SEMRESATTRS_PROJECT_NAME]: "openmtp-ai-bot",
//     },
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor({
//         exporter: new OTLPTraceExporter({
//           headers: {
//           api_key: process.env.PHOENIX_API_KEY!,
//           },
//           url: process.env.PHOENIX_COLLECTOR_ENDPOINT!,
//         }),
//         spanFilter: (span) => {
//           // Only export spans that are OpenInference to remove non-generative spans
//           // This should be removed if you want to export all spans
//           return isOpenInferenceSpan(span);
//         },
//       }),
//     ],
//   });
// }

// import { registerOTel } from "@vercel/otel";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import {
//   isOpenInferenceSpan,
//   OpenInferenceSimpleSpanProcessor,
// } from "@arizeai/openinference-vercel";
// import { Metadata } from "@grpc/grpc-js";
// import { OTLPTraceExporter as GrpcOTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
//
// // For troubleshooting, set the log level to DiagLogLevel.DEBUG
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
//
// export function register() {
//   // Arize specific - Create metadata and add your headers
//   const metadata = new Metadata();
//
//   // Your Arize Space and API Keys, which can be found in the UI
//   metadata.set("space_id", "my_space_id");
//   metadata.set("api_key", "my_api_key");
//   registerOTel({
//     serviceName: "next-app",
//     attributes: {
//       model_id: "vercel-model",
//       model_version: "1.0.0",
//     },
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor({
//         exporter: new GrpcOTLPTraceExporter({
//           url: process.env.PHOENIX_COLLECTOR_ENDPOINT!,
//           metadata,
//         }),
//         spanFilter: (span) => {
//           // Only export spans that are OpenInference spans to negate
//           return isOpenInferenceSpan(span);
//         },
//       }),
//     ],
//   });
// }

// import { registerOTel, OTLPHttpProtoTraceExporter } from '@vercel/otel'
// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
// import {  OpenInferenceSimpleSpanProcessor } from '@arizeai/openinference-vercel'
// import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
//
// // For troubleshooting, set the log level to DiagLogLevel.DEBUG
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
//
// export function register() {
//   registerOTel({
//     serviceName: 'next-app',
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor(),
//       new BatchSpanProcessor(
//         new OTLPHttpProtoTraceExporter({
//           url: 'http://localhost:6006/v1/traces'
//         })
//       )
//     ]
//   })
// }

// export function register() {
//   registerOTel({
//     serviceName: "openmtp-ai-bot",
//     attributes: {
//       [SEMRESATTRS_PROJECT_NAME]: "openmtp-ai-bot",
//     },
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor({
//         exporter: new OTLPTraceExporter({
//           headers: {
//           api_key: process.env.PHOENIX_API_KEY!,
//           },
//           url: process.env.PHOENIX_COLLECTOR_ENDPOINT!,
//         }),
//         spanFilter: isOpenInferenceSpan,
//       }),
//     ],
//   });
// }


// import { registerOTel } from "@vercel/otel";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import {
//   isOpenInferenceSpan,
//   OpenInferenceSimpleSpanProcessor,
// } from "@arizeai/openinference-vercel";
// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
// import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
//
// // For troubleshooting, set the log level to DiagLogLevel.DEBUG
// // This is not required and should not be added in a production setting
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
//
// export function register() {
//   registerOTel({
//     serviceName: "phoenix-next-app",
//     attributes: {
//       // This is not required but it will allow you to send traces to a specific
//       // project in phoenix
//       [SEMRESATTRS_PROJECT_NAME]: "openmtp-app",
//     },
//     spanProcessors: [
//       new OpenInferenceSimpleSpanProcessor({
//         exporter: new OTLPTraceExporter({
//           headers: {
//             // API key if you're sending it to Phoenix
//             api_key: process.env.PHOENIX_API_KEY!,
//           },
//           url:
//             process.env.PHOENIX_COLLECTOR_ENDPOINT!,
//         }),
//         spanFilter: (span) => {
//           // Only export spans that are OpenInference to remove non-generative spans
//           // This should be removed if you want to export all spans
//           return isOpenInferenceSpan(span);
//         },
//       }),
//     ],
//   });
// }
