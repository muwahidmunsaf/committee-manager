
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Button, LoadingSpinner, Textarea, SparklesIcon, ArrowPathIcon } from './UIComponents';
import { generateCommitteeSummary, generateUrduNotification, assessPaymentRisk, getInfoWithGoogleSearch } from '../services/geminiService';
import { AISummaryRequest, Committee, Member, Language, GroundingChunk, CommitteeType } from '../types';
import { getCommitteeMonthName } from '../utils/appUtils'; // Import from utils

interface AIAssistantProps {
  committee?: Committee; // Optional: specific committee context
  member?: Member; // Optional: specific member context
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ committee, member }) => {
  const { t, language, members: allMembers, setIsLoading: setAppIsLoading, isLoading: appIsLoading } = useAppContext();
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<string>('');
  const [groundingSources, setGroundingSources] = useState<GroundingChunk[]>([]);


  const handleGenerateSummary = async () => {
    if (!committee) return;
    setIsLoading(true);
    setAppIsLoading(true);
    setAiResponse('');
    
    const committeeMembers = committee.memberIds.map(id => allMembers.find(m => m.id === id)).filter(Boolean) as Member[];

    const today = new Date();
    const startDate = new Date(committee.startDate);
    let currentPeriodIndex = 0;

    if (committee.type === CommitteeType.MONTHLY) {
        currentPeriodIndex = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
    } else if (committee.type === CommitteeType.WEEKLY) {
        currentPeriodIndex = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    } else { // Daily
        currentPeriodIndex = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    // Ensure currentPeriodIndex is within committee duration and non-negative
    currentPeriodIndex = Math.max(0, Math.min(currentPeriodIndex, committee.duration - 1));
    
    let pendingPaymentsCount = 0;
    committee.memberIds.forEach(memberId => {
      const paymentsForMemberThisPeriod = committee.payments.filter(
        p => p.memberId === memberId && p.monthIndex === currentPeriodIndex && p.status === 'Cleared' // Check against 'Cleared'
      );
      const totalPaidThisPeriod = paymentsForMemberThisPeriod.reduce((sum, p) => sum + p.amountPaid, 0);
      if (totalPaidThisPeriod < committee.amountPerMember) {
        pendingPaymentsCount++;
      }
    });

    const request: AISummaryRequest = {
      committeeTitle: committee.title,
      totalMembers: committeeMembers.length,
      pendingPayments: pendingPaymentsCount,
      language: language,
    };
    try {
      const summary = await generateCommitteeSummary(request);
      setAiResponse(summary);
    } catch (error) {
      setAiResponse(t('errorFetchingSummary'));
    } finally {
      setIsLoading(false);
      setAppIsLoading(false);
    }
  };

  const handleGenerateUrduReminder = async () => {
    if (!member) return;
    setIsLoading(true);
    setAppIsLoading(true);
    setAiResponse('');
    try {
      // Example: generate a late payment reminder
      const notification = await generateUrduNotification(member.name, true);
      setAiResponse(notification);
    } catch (error) {
      setAiResponse(t('errorFetchingSummary')); // Re-use generic error message
    } finally {
      setIsLoading(false);
      setAppIsLoading(false);
    }
  };
  
  const handleAssessRisk = async () => {
    if (!member) return;
    setIsLoading(true);
    setAppIsLoading(true);
    setAiResponse('');
    
    // Create a textual payment history summary focusing on cleared payments.
    let paymentHistorySummary = "";
    if (committee) {
        const memberPayments = committee.payments
            .filter(p => p.memberId === member.id && p.status === 'Cleared') // Consider only cleared payments
            .sort((a, b) => a.monthIndex - b.monthIndex);

        if (memberPayments.length > 0) {
            paymentHistorySummary = memberPayments.map(p => {
                const monthName = getCommitteeMonthName(committee.startDate, p.monthIndex, language);
                // Status for AI can be simpler: just amount paid vs due
                let paymentDescriptor = `Month ${p.monthIndex + 1} (${monthName}): Paid PKR ${p.amountPaid} out of ${committee.amountPerMember}.`;
                return paymentDescriptor;
            }).join('; ');
        } else {
            paymentHistorySummary = language === Language.UR ? "کوئی ادائیگی کی تاریخ دستیاب نہیں ہے۔" : "No payment history available.";
        }
    } else {
        paymentHistorySummary = language === Language.UR ? "کمیٹی کا ڈیٹا دستیاب نہیں۔" : "Committee data not available.";
    }


    try {
      const riskAssessment = await assessPaymentRisk(member.name, paymentHistorySummary, language);
      if (typeof riskAssessment === 'string') {
        setAiResponse(riskAssessment);
      } else {
        setAiResponse(
          language === Language.UR 
          ? `رکن: ${riskAssessment.memberId}\nخطرے کی سطح: ${riskAssessment.riskLevel}\nوجہ: ${riskAssessment.reason}`
          : `Member: ${riskAssessment.memberId}\nRisk Level: ${riskAssessment.riskLevel}\nReason: ${riskAssessment.reason}`
        );
      }
    } catch (error) {
      setAiResponse(t('errorFetchingSummary'));
    } finally {
      setIsLoading(false);
      setAppIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setAppIsLoading(true);
    setSearchResults('');
    setGroundingSources([]);
    try {
      const result = await getInfoWithGoogleSearch(searchQuery);
      setSearchResults(result.text);
      if(result.candidates && result.candidates[0]?.groundingMetadata?.groundingChunks) {
        setGroundingSources(result.candidates[0].groundingMetadata.groundingChunks);
      }
    } catch (error) {
       setSearchResults(t('errorFetchingSummary'));
    } finally {
      setIsLoading(false);
      setAppIsLoading(false);
    }
  };


  return (
    <div className={`mt-6 p-4 border border-primary-light rounded-lg bg-white shadow dark:bg-neutral-darker dark:border-primary-dark ${language === Language.UR ? 'text-right' : 'text-left'}`}>
      <h3 className={`text-lg font-semibold text-primary mb-3 flex items-center ${language === Language.UR ? 'justify-end flex-row-reverse' : ''}`}>
        <SparklesIcon className={`h-6 w-6 text-primary ${language === Language.UR ? 'ml-2' : 'mr-2'}`} />
        {t('aiAssistant')}
      </h3>
      
      <div className="space-y-4">
        {committee && (
          <Button onClick={handleGenerateSummary} isLoading={isLoading && appIsLoading} disabled={isLoading || appIsLoading} className="w-full">
            {t('getSummary')} {t('kमेटी')}
          </Button>
        )}
        {member && language === Language.UR && (
          <Button onClick={handleGenerateUrduReminder} isLoading={isLoading && appIsLoading} disabled={isLoading || appIsLoading} className="w-full">
            {t('generateUrduNotification', { memberName: member.name })}
          </Button>
        )}
         {member && (
          <Button onClick={handleAssessRisk} isLoading={isLoading && appIsLoading} disabled={isLoading || appIsLoading} className="w-full">
            {language === Language.UR ? `${member.name} کے لیے خطرے کا اندازہ لگائیں` : `Assess Risk for ${member.name}`}
          </Button>
        )}

        <div className="mt-4">
          <Textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === Language.UR ? "گوگل سرچ کے ساتھ سوال پوچھیں..." : "Ask a question with Google Search..."}
            rows={2}
            className="mb-2"
          />
          <Button onClick={handleSearch} isLoading={isLoading && appIsLoading} disabled={isLoading || appIsLoading} className="w-full">
            <ArrowPathIcon className={`h-5 w-5 ${language === Language.UR ? 'ml-2' : 'mr-2'}`} />
            {language === Language.UR ? "تلاش کریں" : "Search"}
          </Button>
        </div>
      </div>

      {(isLoading && appIsLoading) && <div className="mt-4 flex justify-center"><LoadingSpinner /></div>}
      
      {aiResponse && !isLoading && (
        <div className="mt-4 p-3 bg-neutral-light dark:bg-neutral-dark rounded">
          <h4 className={`font-semibold mb-1 text-neutral-darker dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>{language === Language.UR ? "AI جواب:" : "AI Response:"}</h4>
          <p className={`text-sm whitespace-pre-wrap text-neutral-dark dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>{aiResponse}</p>
        </div>
      )}

      {searchResults && !isLoading && (
        <div className="mt-4 p-3 bg-neutral-light dark:bg-neutral-dark rounded">
          <h4 className={`font-semibold mb-1 text-neutral-darker dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>{language === Language.UR ? "تلاش کے نتائج:" : "Search Results:"}</h4>
          <p className={`text-sm whitespace-pre-wrap text-neutral-dark dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>{searchResults}</p>
          {groundingSources.length > 0 && (
            <div className="mt-2">
              <h5 className={`text-xs font-semibold text-neutral-darker dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>{language === Language.UR ? "ذرائع:" : "Sources:"}</h5>
              <ul className="list-disc list-inside text-xs">
                {groundingSources.map((source, index) => {
                  const uri = source.web?.uri || source.retrievedContext?.uri;
                  const title = source.web?.title || source.retrievedContext?.title || uri;
                  if (uri) {
                    return (
                      <li key={index}>
                        <a href={uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {title}
                        </a>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
