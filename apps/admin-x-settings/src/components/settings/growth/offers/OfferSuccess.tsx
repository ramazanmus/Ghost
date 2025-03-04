import NiceModal from '@ebay/nice-modal-react';
import {Button} from '@tryghost/admin-x-design-system';
import {Modal} from '@tryghost/admin-x-design-system';
import {RoutingModalProps} from '@tryghost/admin-x-framework/routing';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {useBrowseOffersById} from '@tryghost/admin-x-framework/api/offers';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
const OfferSuccess: React.FC<RoutingModalProps> = ({params}) => {
    // const {updateRoute} = useRouting();
    const {data: {offers: offerById = []} = {}} = useBrowseOffersById(params?.id ? params?.id : '');

    const [offerLink, setOfferLink] = useState<string>('');

    const {siteData} = useGlobalData();

    useEffect(() => {
        if (offerById.length > 0) {
            const offer = offerById[0];
            const offerUrl = `${getHomepageUrl(siteData!)}${offer?.code}`;
            setOfferLink(offerUrl);
        }
    }, [offerById, siteData]);

    const [isCopied, setIsCopied] = useState(false);

    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(offerLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1000); // reset after 1 seconds
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to copy text: ', err);
        }
    };
    
    return <Modal
        footer={false}
        height='full'
        size='lg'
        topRightContent='close'
    >
        <div className='flex h-full flex-col items-center justify-center text-center'>
            <h1 className='text-4xl'>Your new offer is live!</h1>
            <p className='mt-4 max-w-[510px] text-[1.6rem]'>You can share the link anywhere. In your newsletter, social media, a podcast, or in-person. It all just works.</p>
            <div className='mt-8 flex w-full max-w-md flex-col gap-8'>
                <Button color='green' label={isCopied ? 'Copied!' : 'Copy link'} fullWidth onClick={handleCopyClick} />
                <div className='flex items-center gap-4 text-xs font-medium before:h-px before:grow before:bg-grey-300 before:content-[""] after:h-px after:grow after:bg-grey-300 after:content-[""]'>OR</div>
                <div className='flex gap-2'>
                    <Button className='h-8 border border-grey-300' disabled={true} icon='twitter-x' iconColorClass='w-[14px] h-[14px]' size='sm' fullWidth />
                    <Button className='h-8 border border-grey-300' disabled={true} icon='facebook' size='sm' fullWidth />
                    <Button className='h-8 border border-grey-300' disabled={true} icon='linkedin' size='sm' fullWidth />
                </div>
            </div>
        </div>
    </Modal>;
};

export default NiceModal.create(OfferSuccess);
