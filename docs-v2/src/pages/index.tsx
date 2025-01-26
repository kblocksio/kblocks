import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import Markdown from './markdown-page.mdx';


import styles from './index.module.css';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description={siteConfig.tagline}>


      {/* Hero Section */}
      <div className="relative isolate bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
          <div className="px-6 lg:px-0 lg:pt-4">
            <div className="mx-auto max-w-2xl">
              <div className="max-w-lg">
                <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Build Kubernetes Operators with Familiar Tools
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Create <Link className="text-indigo-600 hover:text-indigo-500" to="https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/">custom resource</Link> operators using familiar tools like <Link className="text-indigo-600 hover:text-indigo-500" to="https://helm.sh/">Helm</Link>, <Link className="text-indigo-600 hover:text-indigo-500" to="https://www.terraform.io/">Terraform</Link>, <Link className="text-indigo-600 hover:text-indigo-500" to="https://opentofu.org/">OpenTofu</Link>, <Link className="text-indigo-600 hover:text-indigo-500" to="https://cdk8s.io/">CDK8s</Link> and <Link className="text-indigo-600 hover:text-indigo-500" to="https://www.winglang.io/">Winglang</Link>. Turn your infrastructure code into Kubernetes native resources in minutes.
                </p>
                <CodeBlock language="bash">
                  npm install -g @kblocks/cli
                </CodeBlock>
                <div className="mt-10 flex items-center gap-x-6">
                  <Link
                    to="/docs/user-guide/installation"
                    className="rounded-md bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    Install now
                  </Link>
                  <Link
                    to="https://github.com/kblocksio/kblocks"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    View on GitHub <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
            <div className="shadow-lg md:rounded-3xl">
              <div className="bg-indigo-500 [clip-path:inset(0)] md:[clip-path:inset(0_round_theme(borderRadius.3xl))]">
                <div className="relative px-6 pt-8 sm:pt-16 md:pl-16 md:pr-0">
                  <div className="mx-auto max-w-2xl md:mx-0 md:max-w-none">
                    <div className="w-screen overflow-hidden rounded-tl-xl bg-gray-900">
                      <div className="flex bg-gray-800/40 ring-1 ring-white/5">
                        <div className="-mb-px flex text-sm font-medium leading-6 text-gray-400">
                          <div className="border-b border-r border-b-white/20 border-r-white/10 bg-white/5 px-4 py-2 text-white">
                            kblock.yaml
                          </div>
                        </div>
                      </div>
                      <div className="">
                        <pre className="text-sm text-gray-300 bg-black"><code>{`apiVersion: kblocks.io/v1
kind: Block
spec:
  engine: tofu
  definition:
    description: An Amazon SQS queue
    icon: heroicon://queue-list
    readme: ./README.md
    schema: src/values.schema.json
    outputs:
      - queueUrl
    group: example.com
    version: v1
    kind: Queue
    plural: queues
    singular: queue
  operator:
    envSecrets:
      AWS_DEFAULT_REGION: aws-credentials
      AWS_ACCESS_KEY_ID: aws-credentials
      AWS_SECRET_ACCESS_KEY: aws-credentials
metadata:
  name: queues.example.com`}</code></pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              How does kblocks work?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              You can create a new block in six simple steps.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                <div className="absolute -top-4 left-4 w-10 inline-flex items-center justify-center rounded-xl bg-black p-2 shadow-lg">
                  <span className="text-sm font-semibold leading-6 text-white">1</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Define API</h3>
                <p className="mt-2 text-gray-600">
                  Define the block API through a JSON Schema.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                <div className="absolute -top-4 left-4 w-10 inline-flex items-center justify-center rounded-xl bg-black p-2 shadow-lg">
                  <span className="text-sm font-semibold leading-6 text-white">2</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Choose Engine</h3>
                <p className="mt-2 text-gray-600">
                  Select your preferred engine (Helm, Terraform, OpenTofu, Winglang, etc.)
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                <div className="absolute -top-4 left-4 w-10 inline-flex items-center justify-center rounded-xl bg-black p-2 shadow-lg">
                  <span className="text-sm font-semibold leading-6 text-white">3</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Implement Logic</h3>
                <p className="mt-2 text-gray-600">
                  Write your block logic using the engine's native language.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                <div className="absolute -top-4 left-4 w-10 inline-flex items-center justify-center rounded-xl bg-black p-2 shadow-lg">
                  <span className="text-sm font-semibold leading-6 text-white">4</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Build Operator</h3>
                <p className="mt-2 text-gray-600">
                  Run <code className="rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-800">kb build</code> to create a deployable Kubernetes operator.
                </p>
              </div>

              {/* Step 5 */}
              <div className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                <div className="absolute -top-4 left-4 w-10 inline-flex items-center justify-center rounded-xl bg-black p-2 shadow-lg">
                  <span className="text-sm font-semibold leading-6 text-white">5</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Deploy</h3>
                <p className="mt-2 text-gray-600">
                  Install the operator to your Kubernetes cluster using Helm.
                </p>
              </div>

              {/* Step 6 */}
              <div className="relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
                <div className="absolute -top-4 left-4 w-10 inline-flex items-center justify-center rounded-xl bg-black p-2 shadow-lg">
                  <span className="text-sm font-semibold leading-6 text-white">6</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Done!</h3>
                <p className="mt-2 text-gray-600">
                  Your cluster now has a new custom resource ready to use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Supported Engines Section */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto lg:text-center">
            <div className="flex flex-col items-center">
             
              <p className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl dark:text-black">
                Deploy with your favorite tools
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl">
                KBlocks supports multiple provisioning engines, allowing you to use the tools you're already familiar with to create powerful Kubernetes operators.
              </p>
            </div>
          </div>
          
          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Helm */}
              <Link 
                to="/docs/reference/supported-engines/helm"
                className="col-span-1 lg:col-span-2 row-span-2 rounded-3xl bg-gradient-to-br from-gray-50 to-white p-10 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-black cursor-pointer"
              >
                <div className="flex items-center gap-x-4">
                  <img src="/img/helm.svg" alt="Helm" className="h-12 w-12" />
                  <h3 className="text-2xl font-semibold leading-7 text-gray-900">Helm</h3>
                </div>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Use Helm charts to template Kubernetes resources. Perfect for managing Kubernetes-native applications and resources. Expose any Helm chart as a custom resource and let KBlocks handle the lifecycle management.
                </p>
              </Link>

              {/* Terraform */}
              <Link 
                to="/docs/reference/supported-engines/terraform"
                className="rounded-3xl bg-gradient-to-br from-gray-50 to-white p-10 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-black cursor-pointer"
              >
                <div className="flex items-center gap-x-4">
                  <img src="/img/terraform.svg" alt="Terraform" className="h-12 w-12" />
                  <h3 className="text-2xl font-semibold leading-7 text-gray-900">Terraform</h3>
                </div>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Provision cloud resources using Terraform. Turn your existing Terraform configurations into Kubernetes custom resources.
                </p>
              </Link>

              {/* OpenTofu */}
              <Link 
                to="/docs/reference/supported-engines/tofu"
                className="rounded-3xl bg-gradient-to-br from-gray-50 to-white p-10 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-black cursor-pointer"
              >
                <div className="flex items-center gap-x-4">
                  <img src="/img/tofu.svg" alt="OpenTofu" className="h-12 w-12" />
                  <h3 className="text-2xl font-semibold leading-7 text-gray-900">OpenTofu</h3>
                </div>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Use OpenTofu for infrastructure provisioning. A fully open source alternative to Terraform with complete compatibility.
                </p>
              </Link>

              {/* Wing */}
              <Link 
                to="/docs/reference/supported-engines/wing"
                className="col-span-1 lg:col-span-2 rounded-3xl bg-gradient-to-br from-gray-50 to-white p-10 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-black cursor-pointer"
              >
                <div className="flex items-center gap-x-4">
                  <img src="/img/winglang-symbol-dark.svg" alt="Wing" className="h-12 w-12" />
                  <h3 className="text-2xl font-semibold leading-7 text-gray-900">Wing & CDK8s</h3>
                </div>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Write type-safe infrastructure code using Wing and CDK8s. Perfect for teams that prefer a programmatic approach to infrastructure. Use modern programming languages to define your resources.
                </p>
              </Link>

              {/* Custom Implementation */}
              <Link 
                to="/docs/reference/supported-engines/custom"
                className="rounded-3xl bg-gradient-to-br from-gray-50 to-white p-10 shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-black cursor-pointer"
              >
                <div className="flex items-center gap-x-4">
                  <div className="rounded-lg bg-black p-2">
                    <div className="h-8 w-8 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold leading-7 text-gray-900">Custom</h3>
                </div>
                <p className="mt-4 text-base leading-7 text-gray-600">
                  Implement custom logic in any language through lifecycle hooks. Perfect for unique use cases and specialized requirements that need custom implementation.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>


      {/* Quick Install Section */}
      <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Install kblocks now
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-300">
              KBlocks is installed by running one of the following commands in your terminal.
            </p>
          </div>
          
          <div className="mt-10 mx-auto max-w-3xl">
            <CodeBlock language="bash">
              npm install -g @kblocks/cli
            </CodeBlock>

            <div className="mt-8 text-center">
              <p className="text-gray-300">
                
                Want to learn more before getting started? Take your time to{' '}
                <Link
                  to="/docs"
                  className="text-white underline font-bold"
                >
                  read the documentation
                </Link>
                {' '}first.
              </p>
              
            </div>
          </div>
        </div>
      </div>

      <main>
        {/* <HomepageFeatures /> */}
      </main>
    </Layout>
  );
}
