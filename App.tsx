
import React, { useState, useCallback, useRef } from 'react';
import type { AspectRatio, ContentType, StoryboardImage } from './types';
import { generatePromptsFromScript, generateImageFromPrompt } from './services/geminiService';
import { DownloadIcon, UploadIcon, SpinnerIcon, ZipIcon, RetryIcon } from './components/icons';

// @ts-ignore
const JSZip = window.JSZip;

const DEFAULT_AI_INSTRUCTION = `Analyze the provided script and generate a series of detailed, vivid, and imaginative prompts for an AI image generator. Each prompt should correspond to a paragraph or a logical scene from the script.

Guidelines:
- Focus on visual details: Describe characters, settings, lighting, colors, and atmosphere.
- Convey mood and tension: Use descriptive language to evoke emotions like suspense, joy, or mystery (e.g., "long, distorted shadows in a dimly lit room").
- The output format must be strictly in JSON, containing a single key "prompts" with an array of strings. Each string is a self-contained prompt.`;

interface SettingsPanelProps {
    contentType: ContentType;
    setContentType: (type: ContentType) => void;
    script: string;
    setScript: (script: string) => void;
    prompts: string;
    setPrompts: (prompts: string) => void;
    niche: string;
    setNiche: (niche: string) => void;
    referenceImageUrl: string | null;
    setReferenceImageUrl: (url: string | null) => void;
    styleKeywords: string;
    setStyleKeywords: (keywords: string) => void;
    aspectRatio: AspectRatio;
    setAspectRatio: (ratio: AspectRatio) => void;
    aiPromptInstruction: string;
    setAiPromptInstruction: (instruction: string) => void;
    isLoading: boolean;
    onGenerate: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    contentType, setContentType, script, setScript, prompts, setPrompts, niche, setNiche,
    referenceImageUrl, setReferenceImageUrl, styleKeywords, setStyleKeywords,
    aspectRatio, setAspectRatio, aiPromptInstruction, setAiPromptInstruction,
    isLoading, onGenerate
}) => {
    const scriptFileInputRef = useRef<HTMLInputElement>(null);
    const imageFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, setter: (content: string) => void) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setter(e.target?.result as string);
            reader.readAsText(file);
        }
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setReferenceImageUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const aspectRatioOptions: AspectRatio[] = ["16:9", "9:16", "4:3", "3:4", "1:1"];

    return (
        <div className="w-full lg:w-1/3 xl:w-1/4 bg-gray-800 p-6 overflow-y-auto h-full flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-indigo-400">Settings</h2>
            
            <div className="flex bg-gray-900 rounded-lg p-1">
                <button onClick={() => setContentType('script')} className={`w-1/2 py-2 rounded-md transition-colors ${contentType === 'script' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>From Script</button>
                <button onClick={() => setContentType('prompts')} className={`w-1/2 py-2 rounded-md transition-colors ${contentType === 'prompts' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>From Prompts</button>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Provide Content</label>
                {contentType === 'script' ? (
                    <>
                        <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste your script here..." className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
                        <button onClick={() => scriptFileInputRef.current?.click()} className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-sm py-2 px-4 rounded-md transition-colors">
                            <UploadIcon className="w-4 h-4" /> Upload Script (.txt)
                        </button>
                        <input type="file" accept=".txt" ref={scriptFileInputRef} onChange={(e) => handleFileUpload(e, setScript)} className="hidden" />
                    </>
                ) : (
                    <textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} placeholder="Paste your prompts here, one per line..." className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
                )}
            </div>
            
            <div>
                <label htmlFor="niche" className="block text-sm font-medium mb-2">Niche / Topic</label>
                <input type="text" id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g., futuristic gadgets, ancient history" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-2 text-indigo-300">Image Style</h3>
                <div className="flex items-center gap-4">
                    <button onClick={() => imageFileInputRef.current?.click()} className="w-24 h-24 flex flex-col items-center justify-center bg-gray-700 border-2 border-dashed border-gray-500 rounded-md hover:bg-gray-600 transition-colors">
                        <UploadIcon className="w-6 h-6 mb-1" />
                        <span className="text-xs text-center">Upload Reference</span>
                    </button>
                    <input type="file" accept="image/*" ref={imageFileInputRef} onChange={handleImageUpload} className="hidden" />
                    {referenceImageUrl && <img src={referenceImageUrl} alt="Reference" className="w-24 h-24 object-cover rounded-md" />}
                </div>
                <label htmlFor="style-keywords" className="block text-sm font-medium mt-4 mb-2">Style Keywords</label>
                <input type="text" id="style-keywords" value={styleKeywords} onChange={(e) => setStyleKeywords(e.target.value)} placeholder="e.g., cinematic, photorealistic, 4k" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                    {aspectRatioOptions.map(ratio => (
                        <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-2 text-sm rounded-md transition-colors ${aspectRatio === ratio ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{ratio}</button>
                    ))}
                </div>
            </div>
            
            {contentType === 'script' && (
                <div>
                    <label htmlFor="ai-instructions" className="block text-sm font-medium mb-2">AI Request for Prompts</label>
                    <textarea id="ai-instructions" value={aiPromptInstruction} onChange={(e) => setAiPromptInstruction(e.target.value)} className="w-full h-40 bg-gray-700 border border-gray-600 rounded-md p-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
                </div>
            )}

            <div className="mt-auto pt-6">
                <button onClick={onGenerate} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2">
                    {isLoading ? <><SpinnerIcon className="w-5 h-5" /> Generating...</> : 'Generate Images'}
                </button>
            </div>
        </div>
    );
};

interface OutputPanelProps {
    generatedPrompts: string[];
    storyboard: StoryboardImage[];
    isLoadingPrompts: boolean;
    isLoadingImages: boolean;
    imageGenerationProgress: string;
    error: string | null;
    onRetryImage: (index: number) => void;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ generatedPrompts, storyboard, isLoadingPrompts, isLoadingImages, imageGenerationProgress, error, onRetryImage }) => {
    
    const downloadPrompts = () => {
        const content = generatedPrompts.join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated_prompts.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadImagesAsZip = async () => {
        const zip = new JSZip();
        const successfulImages = storyboard.filter(img => img.status === 'success' && img.imageUrl);
        for (let i = 0; i < successfulImages.length; i++) {
            const imgData = successfulImages[i].imageUrl!.split(',')[1];
            zip.file(`image_${i + 1}.jpeg`, imgData, { base64: true });
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated_images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const hasContent = generatedPrompts.length > 0 || storyboard.length > 0;
    const hasSuccessfulImages = storyboard.some(img => img.status === 'success');
    const isLoading = isLoadingPrompts || isLoadingImages;

    return (
        <div className="w-full lg:w-2/3 xl:w-3/4 bg-gray-900 p-6 md:p-8 overflow-y-auto h-full">
            {!hasContent && !isLoading && !error && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-xl">Your generated content will appear here</p>
                </div>
            )}
            
            {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6">{error}</div>}

            {generatedPrompts.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-indigo-400">Generated Prompts (Script Based)</h3>
                        <button onClick={downloadPrompts} className="bg-gray-700 hover:bg-gray-600 text-sm py-2 px-4 rounded-md transition-colors flex items-center gap-2">
                            <DownloadIcon className="w-4 h-4" /> Download
                        </button>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                        {generatedPrompts.map((p, i) => <p key={i} className="text-sm"><strong className="text-indigo-400">{i+1}.</strong> {p}</p>)}
                    </div>
                </div>
            )}

            {isLoadingPrompts && <div className="flex items-center justify-center gap-3 text-lg"><SpinnerIcon className="w-6 h-6" /> <p>Generating prompts from script...</p></div>}
            
            {storyboard.length > 0 && (
                <div>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-indigo-400">Generated Images</h3>
                        <button onClick={downloadImagesAsZip} disabled={!hasSuccessfulImages} className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-sm py-2 px-4 rounded-md transition-colors flex items-center gap-2">
                            <ZipIcon className="w-4 h-4" /> Download All (.zip)
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {storyboard.map((item, i) => (
                             <div key={i} className="bg-gray-800 rounded-lg overflow-hidden group flex flex-col">
                                <div className="relative w-full h-48">
                                    {item.status === 'success' && item.imageUrl && (
                                        <img src={item.imageUrl} alt={`Generated from prompt ${i+1}`} className="w-full h-full object-cover" />
                                    )}
                                    {item.status === 'generating' && (
                                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                            <SpinnerIcon className="w-8 h-8 text-indigo-400" />
                                        </div>
                                    )}
                                    {item.status === 'error' && (
                                        <div className="w-full h-full bg-red-900/20 border border-red-800/50 flex flex-col items-center justify-center p-4 text-center">
                                            <p className="text-red-300 text-sm font-semibold mb-2">Generation Failed</p>
                                            <button onClick={() => onRetryImage(i)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-colors">
                                                <RetryIcon className="w-4 h-4" />
                                                Retry
                                            </button>
                                            {item.errorMessage && <p className="text-red-400 text-xs mt-3 italic opacity-80 overflow-hidden text-ellipsis whitespace-nowrap w-full max-w-full px-2" title={item.errorMessage}>{item.errorMessage}</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 flex-grow">
                                    <p className="text-xs text-gray-400 leading-relaxed"><strong className="text-indigo-400/80">{i+1}.</strong> {item.prompt}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoadingImages && 
                <div className="flex items-center justify-center gap-3 text-lg mt-8">
                    <SpinnerIcon className="w-6 h-6" /> 
                    <p>{imageGenerationProgress}</p>
                </div>
            }
        </div>
    );
};


export default function App() {
    const [contentType, setContentType] = useState<ContentType>('script');
    const [script, setScript] = useState('');
    const [prompts, setPrompts] = useState('');
    const [niche, setNiche] = useState('');
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
    const [styleKeywords, setStyleKeywords] = useState('cinematic, photorealistic, 4k');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [aiPromptInstruction, setAiPromptInstruction] = useState(DEFAULT_AI_INSTRUCTION);
    
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [storyboard, setStoryboard] = useState<StoryboardImage[]>([]);

    const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
    const [imageGenerationProgress, setImageGenerationProgress] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        setError(null);
        setGeneratedPrompts([]);
        setStoryboard([]);

        let promptsToProcess: string[] = [];

        // --- Step 1: Get prompts to process ---
        if (contentType === 'script') {
            if (!script.trim()) {
                setError('Script content cannot be empty.');
                return;
            }
            setIsLoadingPrompts(true);
            try {
                const resultPrompts = await generatePromptsFromScript(script, niche, aiPromptInstruction);
                setGeneratedPrompts(resultPrompts);
                promptsToProcess = resultPrompts;
            } catch (err) {
                console.error(err);
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(`Error during prompt generation: ${errorMessage}`);
                setIsLoadingPrompts(false);
                return;
            }
            setIsLoadingPrompts(false);
        } else {
            if (!prompts.trim()) {
                setError('Prompts cannot be empty.');
                return;
            }
            promptsToProcess = prompts.split('\n').filter(p => p.trim() !== '');
        }

        if (promptsToProcess.length === 0) {
            if (contentType === 'script') {
                setError('The script did not yield any prompts. Try adjusting the script or AI instructions.');
            } else {
                setError('No valid prompts found to generate images.');
            }
            return;
        }

        // --- Step 2: Generate images from prompts ---
        const initialStoryboard: StoryboardImage[] = promptsToProcess.map(prompt => ({
            prompt,
            imageUrl: null,
            status: 'pending',
        }));
        setStoryboard(initialStoryboard);

        for (let i = 0; i < promptsToProcess.length; i++) {
            setImageGenerationProgress(`Generating image ${i + 1} of ${promptsToProcess.length}...`);
            setStoryboard(prev => prev.map((item, index) => index === i ? { ...item, status: 'generating' } : item));
            
            try {
                const currentPrompt = promptsToProcess[i];
                const imageUrl = await generateImageFromPrompt(currentPrompt, styleKeywords, aspectRatio, referenceImageUrl);
                setStoryboard(prev => prev.map((item, index) => index === i ? { ...item, status: 'success', imageUrl } : item));
            } catch (err) {
                console.error(err);
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setStoryboard(prev => prev.map((item, index) => index === i ? { ...item, status: 'error', errorMessage } : item));
            }
        }
        setImageGenerationProgress('');
    }, [contentType, script, prompts, niche, aiPromptInstruction, styleKeywords, aspectRatio, referenceImageUrl]);
    
    const handleRetryImage = async (index: number) => {
        const imageToRetry = storyboard[index];
        if (!imageToRetry || imageToRetry.status !== 'error') return;

        setImageGenerationProgress(`Retrying image ${index + 1}...`);
        setStoryboard(prev => prev.map((item, idx) => idx === index ? { ...item, status: 'generating', errorMessage: undefined } : item));

        try {
            const imageUrl = await generateImageFromPrompt(imageToRetry.prompt, styleKeywords, aspectRatio, referenceImageUrl);
            setStoryboard(prev => prev.map((item, idx) => idx === index ? { ...item, status: 'success', imageUrl } : item));
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setStoryboard(prev => prev.map((item, idx) => idx === index ? { ...item, status: 'error', errorMessage } : item));
        } finally {
            setImageGenerationProgress('');
        }
    };
    
    const isLoadingImages = storyboard.some(s => s.status === 'generating');
    const isLoading = isLoadingPrompts || isLoadingImages;

    return (
        <div className="flex flex-col lg:flex-row h-screen w-screen">
            <SettingsPanel 
                contentType={contentType} setContentType={setContentType}
                script={script} setScript={setScript}
                prompts={prompts} setPrompts={setPrompts}
                niche={niche} setNiche={setNiche}
                referenceImageUrl={referenceImageUrl} setReferenceImageUrl={setReferenceImageUrl}
                styleKeywords={styleKeywords} setStyleKeywords={setStyleKeywords}
                aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                aiPromptInstruction={aiPromptInstruction} setAiPromptInstruction={setAiPromptInstruction}
                isLoading={isLoading}
                onGenerate={handleGenerate}
            />
            <OutputPanel
                generatedPrompts={generatedPrompts}
                storyboard={storyboard}
                isLoadingPrompts={isLoadingPrompts}
                isLoadingImages={isLoadingImages}
                imageGenerationProgress={imageGenerationProgress}
                error={error}
                onRetryImage={handleRetryImage}
            />
        </div>
    );
}
