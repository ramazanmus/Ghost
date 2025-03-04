import NewslettersList from './newsletters/NewslettersList';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {ReactNode, useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useQueryParams from '../../../hooks/useQueryParams';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Button, ConfirmationModal, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {InfiniteData, useQueryClient} from '@tryghost/admin-x-framework';
import {Newsletter, NewslettersResponseType, newslettersDataType, useBrowseNewsletters, useEditNewsletter, useVerifyNewsletterEmail} from '@tryghost/admin-x-framework/api/newsletters';
import {arrayMove} from '@dnd-kit/sortable';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const NavigateToNewsletter = ({id, children}: {id: string; children: ReactNode}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    return <button className="text-green" type="button" onClick={() => {
        updateRoute(`newsletters/${id}`);
        modal.remove();
    }}>{children}</button>;
};

const Newsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openNewsletterModal = () => {
        updateRoute('newsletters/new');
    };
    const [selectedTab, setSelectedTab] = useState('active-newsletters');
    const {data: {newsletters: apiNewsletters, meta, isEnd} = {}, fetchNextPage} = useBrowseNewsletters();
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const queryClient = useQueryClient();

    const verifyEmailToken = useQueryParams().getParam('verifyEmail');
    const {mutateAsync: verifyEmail} = useVerifyNewsletterEmail();
    const handleError = useHandleError();

    const [newsletters, setNewsletters] = useState<Newsletter[]>(apiNewsletters || []);

    useEffect(() => {
        setNewsletters(apiNewsletters || []);
    }, [apiNewsletters]);

    useEffect(() => {
        if (!verifyEmailToken) {
            return;
        }

        const verify = async () => {
            try {
                const {newsletters: [updatedNewsletter]} = await verifyEmail({token: verifyEmailToken});

                NiceModal.show(ConfirmationModal, {
                    title: 'Email address verified',
                    prompt: <>Success! From address for newsletter <NavigateToNewsletter id={updatedNewsletter.id}>{updatedNewsletter.name}</NavigateToNewsletter> changed to <strong>{updatedNewsletter.sender_email}</strong></>,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            } catch (e) {
                let prompt = 'There was an error verifying your email address. Please try again.';

                if (e instanceof APIError && e.message === 'Token expired') {
                    prompt = 'The verification link has expired. Please try again.';
                }
                NiceModal.show(ConfirmationModal, {
                    title: 'Error verifying email address',
                    prompt: prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
                handleError(e, {withToast: false});
            }
        };
        verify();
    }, [verifyEmailToken, handleError, verifyEmail]);

    const buttons = (
        <Button color='green' label='Add newsletter' link linkWithPadding onClick={() => {
            openNewsletterModal();
        }} />
    );

    const sortedActiveNewsletters = newsletters.filter(n => n.status === 'active').sort((a, b) => a.sort_order - b.sort_order) || [];
    const archivedNewsletters = newsletters.filter(newsletter => newsletter.status !== 'active');

    const onSort = async (id: string, overId?: string) => {
        const fromIndex = sortedActiveNewsletters.findIndex(newsletter => newsletter.id === id);
        const toIndex = sortedActiveNewsletters.findIndex(newsletter => newsletter.id === overId) || 0;
        const newSortOrder = arrayMove(sortedActiveNewsletters, fromIndex, toIndex);

        const updatedActiveNewsletters = newSortOrder.map((newsletter, index) => (
            newsletter.sort_order === index ? null : {...newsletter, sort_order: index}
        )).filter((newsletter): newsletter is Newsletter => !!newsletter);

        const updatedArchivedNewsletters = archivedNewsletters.map((newsletter, index) => (
            newsletter.sort_order === index + sortedActiveNewsletters.length ? null : {...newsletter, sort_order: index}
        )).filter((newsletter): newsletter is Newsletter => !!newsletter);

        const orderUpdatedNewsletters = [...updatedActiveNewsletters, ...updatedArchivedNewsletters].sort((a, b) => a.sort_order - b.sort_order);

        // Set the new order in local state and cache first so that the UI updates immediately
        setNewsletters(newsletters.map(newsletter => orderUpdatedNewsletters.find(n => n.id === newsletter.id) || newsletter));
        queryClient.setQueriesData<InfiniteData<NewslettersResponseType>>([newslettersDataType], (currentData) => {
            if (!currentData) {
                return;
            }

            return {
                ...currentData,
                pages: currentData.pages.map(page => ({
                    ...page,
                    newsletters: page.newsletters.map(newsletter => orderUpdatedNewsletters.find(n => n.id === newsletter.id) || newsletter)
                }))
            };
        });

        for (const newsletter of orderUpdatedNewsletters) {
            await editNewsletter(newsletter);
        }
    };

    const tabs = [
        {
            id: 'active-newsletters',
            title: 'Active',
            contents: (<NewslettersList newsletters={sortedActiveNewsletters} isSortable onSort={onSort} />)
        },
        {
            id: 'archived-newsletters',
            title: 'Archived',
            contents: (<NewslettersList newsletters={archivedNewsletters} />)
        }
    ];

    return (
        <TopLevelGroup
            customButtons={buttons}
            keywords={keywords}
            navid='newsletters'
            testId='newsletters'
            title='Newsletters'
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
            {isEnd === false && <Button
                label={`Load more (showing ${newsletters?.length || 0}/${meta?.pagination.total || 0} newsletters)`}
                link
                onClick={() => fetchNextPage()}
            />}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Newsletters, 'Newsletters');
